import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { UsersService } from "src/users/users.service";

import { BlooksSellBlookDto, NotFound, Forbidden } from "blacket-types";
import { Blook, User } from "@prisma/client";

@Injectable()
export class BlooksService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private usersService: UsersService
    ) { }

    async getBlookById(blookId: Blook["id"]): Promise<Blook> {
        const blook = this.redisService.getBlook(blookId);
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        return blook;
    }

    async getBlookByName(blookName: Blook["name"]): Promise<Blook> {
        const blook = this.redisService.getBlook(blookName.toLowerCase());
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        return blook;
    }

    async sellBlooks(userId: User["id"], dto: BlooksSellBlookDto): Promise<void> {
        const blook = await this.getBlookById(dto.blookId);

        const userBlookCount = await this.prismaService.userBlook.count({
            where: {
                userId,
                blookId: dto.blookId,
                sold: false,
                auctions: { none: { expiresAt: { gt: new Date() } } }
            }
        });

        if (userBlookCount < dto.quantity) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

        const userBlooks = await this.prismaService.userBlook.findMany({
            where: {
                userId,
                blookId: dto.blookId,
                sold: false
            },
            take: dto.quantity,
            orderBy: { createdAt: "desc" },
            select: { id: true }
        });

        await this.prismaService.userBlook.updateMany({
            where: {
                userId,
                OR: userBlooks.map((blook) => ({ id: blook.id }))
            },
            data: { sold: true }
        });
        await this.usersService.addTokens(userId, blook.price * dto.quantity);
    }
}
