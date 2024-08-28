import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { PermissionsService } from "src/permissions/permissions.service";
import { AuctionsCreateAuctionDto, AuctionsSearchAuctionDto, BadRequest, Forbidden, NotFound, PrivateUser } from "@blacket/types";
import { Auction, AuctionType, PermissionType } from "@blacket/core";

@Injectable()
export class AuctionsService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private usersService: UsersService,
        private permissionsService: PermissionsService
    ) { }

    async getAuctions(dto: AuctionsSearchAuctionDto = {}): Promise<Auction[]> {
        if (dto.blookId && dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

        return this.prismaService.auction.findMany({
            include: {
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
                },
                seller: {
                    include: { customAvatar: true, customBanner: true },
                    omit: {
                        password: true,
                        ipAddress: true
                    }
                },
                bids: {
                    include: {
                        user: {
                            include: { customAvatar: true, customBanner: true },
                            omit: {
                                password: true,
                                ipAddress: true
                            }
                        }
                    }
                }
            },
            where: {
                type: dto.type ?? undefined,
                blook: { blookId: dto.blookId ?? undefined },
                item: { itemId: dto.itemId ?? undefined },

                // i don't know why this has to be done but it does
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
                sellerId: dto.sellerId ?? undefined,
                buyerId: null,
                expiresAt: { gt: new Date() }
            },
            orderBy: dto.endingSoon ? { expiresAt: "asc" } : undefined
        });
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

                blook = await this.prismaService.userBlook.findFirst({
                    where: { userId, blookId: dto.blookId, sold: false, auctions: { none: { expiresAt: { gt: new Date() }, buyerId: null } } },
                    orderBy: { createdAt: "asc" }
                });
                if (!blook) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

                break;
            case AuctionType.ITEM:
                if (!dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

                item = await this.prismaService.userItem.findUnique({
                    where: { id: dto.itemId, userId, usesLeft: { gt: 0 }, auctions: { none: { expiresAt: { gt: new Date() }, buyerId: null } } }
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
            const user = await prisma.user.update({ where: { id: userId }, data: { tokens: { decrement: (Math.floor(auctionTax) + durationTax) } } });
            if (user.tokens < 0) throw new ForbiddenException(Forbidden.AUCTIONS_TAX_NOT_ENOUGH_TOKENS);

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

    async buyItNow(userId: string, id: number) {
        const auction = await this.prismaService.auction.findUnique({
            where: {
                id,
                buyerId: null,
                buyItNow: true,
                expiresAt: { gt: new Date() }
            }, include: { seller: true }
        });
        if (!auction) throw new NotFoundException(NotFound.UNKNOWN_AUCTION);

        if (auction.seller.id === userId) throw new ForbiddenException(Forbidden.AUCTIONS_BUY_IT_NOW_OWN_AUCTION);

        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.tokens < auction.price) throw new ForbiddenException(Forbidden.AUCTIONS_BUY_IT_NOW_NOT_ENOUGH_TOKENS);

        return await this.prismaService.$transaction(async (prisma) => {
            const user = await prisma.user.update({ where: { id: userId }, data: { tokens: { decrement: auction.price } } });
            if (user.tokens < 0) throw new ForbiddenException(Forbidden.AUCTIONS_BUY_IT_NOW_NOT_ENOUGH_TOKENS);

            await prisma.auction.update({ where: { id }, data: { buyer: { connect: { id: userId } } } });
            await prisma.user.update({ where: { id: auction.seller.id }, data: { tokens: { increment: auction.price } } });

            if (auction.type === AuctionType.BLOOK) await prisma.userBlook.update({ where: { id: auction.blookId }, data: { user: { connect: { id: userId } } } });
            else await prisma.userItem.update({ where: { id: auction.itemId }, data: { user: { connect: { id: userId } } } });
        });
    }
}
