import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { AuctionsCreateAuctionDto, AuctionTypeEnum, BadRequest, Forbidden, NotFound } from "blacket-types";
import { Auction } from "@prisma/client";

@Injectable()
export class AuctionsService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private usersService: UsersService
    ) { }

    async getAuctions(): Promise<Auction[]> {
        return this.prismaService.auction.findMany({
            include: {
                blook: {
                    select: { blookId: true }
                },
                item: {
                    select: { itemId: true, usesLeft: true }
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
            where: { expiresAt: { gt: new Date() } }
        });
    }

    async createAuction(userId: string, dto: AuctionsCreateAuctionDto) {
        if (!dto.blookId && !dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);
        if (dto.blookId && dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

        switch (dto.type) {
            case AuctionTypeEnum.BLOOK:
                if (!dto.blookId) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);
                if (!this.redisService.getBlook(dto.blookId)) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

                const blook = await this.prismaService.userBlook.findFirst({
                    where: { userId, blookId: dto.blookId, sold: false, auctions: { none: { expiresAt: { gt: new Date() } } } },
                    orderBy: { createdAt: "asc" }
                });
                if (!blook) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

                return await this.prismaService.auction.create({
                    data: {
                        type: dto.type,
                        blook: { connect: { id: blook.id } },
                        price: dto.price,
                        expiresAt: new Date(Date.now() + dto.duration * 60000),
                        seller: { connect: { id: userId } },
                        buyItNow: dto.buyItNow
                    }
                });
            case AuctionTypeEnum.ITEM:
                if (!dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

                const item = await this.prismaService.userItem.findUnique({
                    where: { id: dto.itemId, userId, usesLeft: { gt: 0 }, auctions: { none: { expiresAt: { gt: new Date() } } } }
                });
                if (!item) throw new ForbiddenException(Forbidden.ITEMS_NOT_ENOUGH_ITEMS);

                return await this.prismaService.auction.create({
                    data: {
                        type: dto.type,
                        item: { connect: { id: item.id } },
                        price: dto.price,
                        expiresAt: new Date(Date.now() + dto.duration * 60000),
                        seller: { connect: { id: userId } },
                        buyItNow: dto.buyItNow
                    }
                });
            default: throw new BadRequestException(BadRequest.DEFAULT);
        }
    }
}
