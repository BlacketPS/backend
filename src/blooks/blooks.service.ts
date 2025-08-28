import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

import { BlooksSellBlookDto, NotFound } from "@blacket/types";

@Injectable()
export class BlooksService {
    constructor(
        private prismaService: PrismaService
    ) { }

    async sellBlooks(userId: string, dto: BlooksSellBlookDto): Promise<void> {
        return await this.prismaService.$transaction(async (tx) => {
            const userBlooks = await tx.userBlook.findMany({
                where: {
                    id: { in: dto.blooks },
                    userId,
                    sold: false,
                    auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } }
                },
                include: {
                    blook: true
                }
            });
            if (userBlooks.length !== dto.blooks.length) throw new NotFoundException(NotFound.UNKNOWN_BLOOK);

            await tx.userBlook.updateMany({ where: { id: { in: userBlooks.map((blook) => blook.id) } }, data: { sold: true } });
            await tx.user.update({ where: { id: userId }, data: { diamonds: { increment: userBlooks.reduce((acc, blook) => acc + (blook.shiny ? (blook.blook.price * 10) : blook.blook.price), 0) } } });
        });
    }
}
