import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";

import { BlooksSellBlookDto, NotFound, Forbidden } from "@blacket/types";
import { User } from "@blacket/core";

@Injectable()
export class BlooksService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
    ) { }

    async sellBlooks(userId: string, dto: BlooksSellBlookDto): Promise<void> {
        const blook = await this.redisService.getBlook(dto.blookId);
        if (!blook) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

        return await this.prismaService.$transaction(async (tx) => {
            const userBlooks = await tx.userBlook.findMany({
                where: {
                    userId,
                    blookId: dto.blookId,
                    sold: false,
                    auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } }
                },
                take: dto.quantity,
                orderBy: { createdAt: "desc" },
                select: { id: true }
            });

            if (userBlooks.length < dto.quantity) throw new ForbiddenException(Forbidden.BLOOKS_NOT_ENOUGH_BLOOKS);

            await tx.userBlook.updateMany({ where: { userId, OR: userBlooks.map((blook) => ({ id: blook.id })) }, data: { sold: true } });
            await tx.user.update({ where: { id: userId }, data: { tokens: { increment: blook.price * userBlooks.length } } });
        });
    }
}
