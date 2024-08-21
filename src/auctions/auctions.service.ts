import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { AuctionsCreateAuctionDto, AuctionTypeEnum, BadRequest, Forbidden, NotFound } from "blacket-types";

@Injectable()
export class AuctionsService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private usersService: UsersService
    ) { }

    async getAuctions() {
        return this.prismaService.auction.findMany({
            include: {
                seller: {
                    select: {
                        id: true,
                        username: true,
                        color: true,
                        fontId: true
                    }
                },
                bids: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                color: true,
                                fontId: true
                            }
                        }
                    }
                }
            },
            omit: {
                sellerId: true
            }
        });
    }

    async createAuction(userId: string, dto: AuctionsCreateAuctionDto) {
        if (!dto.blookId && !dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);
        if (dto.blookId && dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);

        if (dto.duration > 10080) throw new BadRequestException(BadRequest.AUCTIONS_INVALID_DURATION);

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
                        seller: { connect: { id: userId } }
                    }
                });
            case AuctionTypeEnum.ITEM:
                if (!dto.itemId) throw new BadRequestException(BadRequest.DEFAULT);
                break;
        }
    }
}
