import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { SocketService } from "src/socket/socket.service";
import { UsersService } from "src/users/users.service";
import { PermissionsService } from "src/permissions/permissions.service";
import { CoreService } from "src/core/core.service";
import { AuctionsBidAuctionDto, AuctionsBuyAuctionDto, AuctionsCreateAuctionDto, AuctionsSearchAuctionDto, BadRequest, Forbidden, NotFound, PrivateUser, SocketAuctionBidEntity, SocketAuctionExpireEntity } from "@blacket/types";
import { Auction, AuctionType, PermissionType } from "@blacket/core";

@Injectable()
export class AuctionsService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private socketService: SocketService,
        private usersService: UsersService,
        private permissionsService: PermissionsService,
        private coreService: CoreService
    ) { }

    async getAuctions(dto: AuctionsSearchAuctionDto = {}): Promise<Auction[]> {
        if (dto.blookId && dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

        const auctions = await this.prismaService.auction.findMany({
            include: {
                blook: true,
                item: {
                    select: {
                        id: true,
                        itemId: true,
                        usesLeft: true
                    }
                },
                seller: {
                    include: { customAvatar: true, customBanner: true }
                },
                bids: {
                    include: {
                        user: {
                            include: { customAvatar: true, customBanner: true }
                        }
                    }
                }
            },
            where: dto.id
                ? {
                    id: dto.id,
                    delistedAt: null,
                    buyerId: null,
                    expiresAt: { gt: new Date() }
                }
                : {

                    type: dto.type ?? undefined,
                    blook: { blookId: dto.blookId ?? undefined, shiny: dto.shiny ?? undefined },
                    item: { itemId: dto.itemId ?? undefined },

                    OR: [
                        {
                            blook: {
                                blook: {
                                    name: {
                                        contains: dto.query ?? undefined,
                                        mode: "insensitive"
                                    },
                                    rarityId: dto.rarityId ?? undefined
                                }
                            }
                        },
                        {
                            item: {
                                item: {
                                    rarityId: dto.rarityId ?? undefined,
                                    name: {
                                        contains: dto.query ?? undefined,
                                        mode: "insensitive"
                                    }
                                }
                            }
                        }
                    ],

                    buyItNow: dto.buyItNow ?? undefined,
                    buyerId: null,
                    delistedAt: null,
                    seller: dto.seller ? {
                        OR: [
                            { id: { equals: dto.seller } },
                            { username: { equals: dto.seller, mode: "insensitive" } }
                        ]
                    } : undefined,
                    expiresAt: { gt: new Date() }
                },
            orderBy: dto.endingSoon ? { expiresAt: "asc" } : { createdAt: "desc" }
        });

        for (const auction of auctions) auction.bids = auction.bids
            .sort((a, b) => b.amount - a.amount);

        return auctions;
    }

    async createAuction(userId: string, dto: AuctionsCreateAuctionDto) {
        if (!dto.blookId && !dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);
        if (dto.blookId && dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

        let blook = null;
        let item = null;

        switch (dto.type) {
            case AuctionType.BLOOK:
                if (!dto.blookId) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);
                if (!this.redisService.getBlook(dto.blookId)) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

                blook = await this.prismaService.userBlook.findUnique({
                    where: { id: dto.blookId, userId, sold: false, auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } } }
                });
                if (!blook) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

                break;
            case AuctionType.ITEM:
                if (!dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

                item = await this.prismaService.userItem.findUnique({
                    where: { id: dto.itemId, userId, usesLeft: { gt: 0 }, auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } } }
                });
                if (!item) throw new ForbiddenException(Forbidden.ITEMS_NOT_ENOUGH_ITEMS);

                break;
        }

        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        let auctionTax = dto.price * (dto.buyItNow ? 0.025 : 0.05);
        if (this.permissionsService.hasPermission(new PrivateUser(user).permissions, PermissionType.LESS_AUCTION_TAX)) auctionTax = auctionTax * 0.75;

        const durationTax = Math.floor(dto.duration / 60 * 10);

        return await this.prismaService.$transaction(async (prisma) => {
            const user = await prisma.user.update({ where: { id: userId }, data: { diamonds: { decrement: (Math.floor(auctionTax) + durationTax) } } });
            if (user.diamonds < 0) throw new ForbiddenException(Forbidden.AUCTIONS_TAX_NOT_ENOUGH_DIAMONDS);

            return await prisma.auction.create({
                data: {
                    type: dto.type,
                    blook: blook ? { connect: { id: blook.id } } : undefined,
                    item: item ? { connect: { id: item.id } } : undefined,
                    price: dto.price,
                    expiresAt: new Date(Date.now() + dto.duration * 60000),
                    seller: { connect: { id: userId } },
                    buyItNow: dto.buyItNow
                }
            });
        });
    }

    async buyItNow(userId: string, id: number, dto: AuctionsBuyAuctionDto, ip: string) {
        const captcha = await this.coreService.verifyTurnstile(dto.captchaToken, ip);
        if (!captcha) throw new ForbiddenException(Forbidden.DEFAULT);

        const auction = await this.prismaService.auction.findUnique({
            where: {
                id,
                buyItNow: true,
                buyerId: null,
                delistedAt: null,
                expiresAt: { gt: new Date() }
            }, include: {
                blook: {
                    select: {
                        blookId: true
                    }
                },
                item: {
                    select: {
                        id: true,
                        itemId: true,
                        usesLeft: true
                    }
                }
            }
        });
        if (!auction) throw new NotFoundException(NotFound.UNKNOWN_AUCTION);

        if (auction.sellerId === userId) throw new ForbiddenException(Forbidden.AUCTIONS_BUY_IT_NOW_OWN_AUCTION);

        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.diamonds < auction.price) throw new ForbiddenException(Forbidden.AUCTIONS_BUY_IT_NOW_NOT_ENOUGH_DIAMONDS);

        return await this.prismaService.$transaction(async (prisma) => {
            const user = await prisma.user.update({ where: { id: userId }, data: { diamonds: { decrement: auction.price } } });
            if (user.diamonds < 0) throw new ForbiddenException(Forbidden.AUCTIONS_BUY_IT_NOW_NOT_ENOUGH_DIAMONDS);

            await prisma.user.update({ where: { id: auction.sellerId }, data: { diamonds: { increment: auction.price } } });

            if (auction.type === AuctionType.BLOOK) await prisma.userBlook.update({ where: { id: auction.blookId }, data: { user: { connect: { id: userId } } } });
            else await prisma.userItem.update({ where: { id: auction.itemId }, data: { user: { connect: { id: userId } } } });

            await prisma.auction.update({ where: { id }, data: { buyer: { connect: { id: userId } }, delistedAt: new Date() } });

            this.socketService.emitAuctionExpireEvent(new SocketAuctionExpireEntity({
                id: auction.id,
                type: auction.type,
                blook: auction?.blook,
                item: auction?.item,
                sellerId: auction.sellerId,
                buyerId: userId,
                price: auction.price,
                buyItNow: true
            }));
        });
    }

    async bid(userId: string, id: number, dto: AuctionsBidAuctionDto, ip: string) {
        const captcha = await this.coreService.verifyTurnstile(dto.captchaToken, ip);
        if (!captcha) throw new ForbiddenException(Forbidden.DEFAULT);

        const auction = await this.prismaService.auction.findUnique({
            where: {
                id,
                buyItNow: false,
                buyerId: null,
                delistedAt: null,
                expiresAt: { gt: new Date() }
            },
            include: {
                seller: true,
                bids: {
                    include: {
                        user: {
                            include: { customAvatar: true, customBanner: true }
                        }
                    }
                },
                blook: {
                    select: {
                        blookId: true
                    }
                },
                item: {
                    select: {
                        id: true,
                        itemId: true,
                        usesLeft: true
                    }
                }
            }
        });
        if (!auction) throw new NotFoundException(NotFound.UNKNOWN_AUCTION);

        if (auction.seller.id === userId) throw new ForbiddenException(Forbidden.AUCTIONS_BID_OWN_AUCTION);

        const userPreviousBids = auction.bids.filter((bid) => bid.user.id === userId);
        const highestPreviousBidAmount = userPreviousBids.length > 0
            ? Math.max(...userPreviousBids.map((bid) => bid.amount))
            : 0;

        if (dto.amount <= highestPreviousBidAmount) {
            throw new ForbiddenException(
                Forbidden.AUCTIONS_BID_TOO_LOW.replace("%s", (highestPreviousBidAmount + 1).toLocaleString())
            );
        }

        const additionalAmount = dto.amount - highestPreviousBidAmount;

        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.diamonds < additionalAmount) {
            throw new ForbiddenException(Forbidden.AUCTIONS_BID_NOT_ENOUGH_DIAMONDS);
        }

        if (auction.price >= dto.amount) {
            throw new ForbiddenException(
                Forbidden.AUCTIONS_BID_TOO_LOW.replace("%s", (auction.price + 1).toLocaleString())
            );
        }

        if (auction.bids.length > 0 && auction.bids[0].amount >= dto.amount) {
            throw new ForbiddenException(
                Forbidden.AUCTIONS_BID_TOO_LOW.replace("%s", (auction.bids[0].amount + 1).toLocaleString())
            );
        }

        await this.prismaService.$transaction(async (tx) => {
            // deduct only the additional amount from the user's diamonds
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { diamonds: { decrement: additionalAmount } }
            });
            if (updatedUser.diamonds < 0) {
                throw new ForbiddenException(Forbidden.AUCTIONS_BID_NOT_ENOUGH_DIAMONDS);
            }

            // create a new bid
            const bid = await tx.auctionBid.create({
                data: {
                    auction: { connect: { id } },
                    user: { connect: { id: userId } },
                    amount: dto.amount
                }
            });

            this.socketService.emitAuctionBidEvent(
                new SocketAuctionBidEntity({
                    id: bid.id,
                    auctionId: auction.id,
                    type: auction.type,
                    amount: bid.amount,
                    blook: auction?.blook,
                    item: auction?.item,
                    bidderId: userId,
                    sellerId: auction.seller.id,
                    bidders: [...new Set(auction.bids.map((bid) => bid.user.id))]
                })
            );
        });
    }

    async removeAuction(userId: string, id: number) {
        const auction = await this.prismaService.auction.findUnique({
            where: {
                id,
                sellerId: userId,
                buyerId: null,
                delistedAt: null,
                expiresAt: { gt: new Date() }
            },
            include: {
                bids: true,
                blook: {
                    select: {
                        blookId: true
                    }
                },
                item: {
                    select: {
                        id: true,
                        itemId: true,
                        usesLeft: true
                    }
                }
            }
        });
        if (!auction) throw new NotFoundException(NotFound.UNKNOWN_AUCTION);

        if (auction.bids.length > 0) throw new ForbiddenException(Forbidden.AUCTIONS_REMOVE_HAS_BIDS);

        await this.prismaService.auction.update({ where: { id }, data: { delistedAt: new Date() } });

        this.socketService.emitAuctionExpireEvent(new SocketAuctionExpireEntity({
            id: auction.id,
            type: auction.type,
            blook: auction?.blook,
            item: auction?.item,
            sellerId: auction.sellerId,
            buyerId: null,
            price: auction.price,
            buyItNow: auction.buyItNow
        }));
    }

    async getRecentAveragePrice(dto: AuctionsSearchAuctionDto) {
        if (!dto.blookId && !dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);
        if (dto.blookId && dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

        const cache = await this.redisService.getKey("recentAveragePrice", dto);
        if (cache) return cache;

        const auctions = await this.prismaService.auction.findMany({
            where: {
                type: dto.type,
                blook: { blookId: dto.blookId },
                item: { itemId: dto.itemId },

                buyerId: { not: null }
            },
            include: {
                bids: true
            },
            take: 25,
            orderBy: { createdAt: "desc" }
        });
        if (auctions.length < 1) {
            await this.redisService.setKey("recentAveragePrice", dto, { averagePrice: null, lowestPrice: null, highestPrice: null, suspicious: false }, 0);

            return { averagePrice: null, lowestPrice: null, highestPrice: null, suspicious: false };
        };

        let suspicious = false;

        const prices = auctions.map((auction) => auction.buyItNow ? auction.price : auction.bids.sort((a, b) => b.amount - a.amount)[0].amount);
        prices.sort((a, b) => a - b);

        const medianPrice = prices[Math.floor(prices.length / 2)];

        const minPriceThreshold = medianPrice * 0.1;
        const maxPriceThreshold = medianPrice * 10;

        const filteredPrices = prices.filter((price) => price > minPriceThreshold && price < maxPriceThreshold);
        if (filteredPrices.length < prices.length - 3) suspicious = true;

        const averagePrice = Math.round(filteredPrices.reduce((a, b) => a + b) / filteredPrices.length);
        const lowestPrice = Math.min(...filteredPrices);
        const highestPrice = Math.max(...filteredPrices);

        await this.redisService.setKey("recentAveragePrice", dto, { averagePrice, lowestPrice, highestPrice, suspicious }, 0);

        return { averagePrice, lowestPrice, highestPrice, suspicious };
    }
}
