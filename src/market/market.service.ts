import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { MarketOpenPackDto, NotFound, Forbidden, openPack, InternalServerError } from "@blacket/types";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { DataService } from "src/data/data.service";
import { BlookObtainMethod } from "@blacket/core";

@Injectable()
export class MarketService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private dataService: DataService
    ) { }

    // as opening packs is one of the MOST intensive operations we do
    // i'll be probably optimising this a few times and doing performance measures
    async openPack(userId: string, dto: MarketOpenPackDto) {
        const pack = await this.redisService.getPack(dto.packId);
        if (!pack) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        if (!pack.enabled) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        const user = await this.prismaService.user.findUnique({ select: { tokens: true }, where: { id: userId } });

        if (user.tokens < pack.price) throw new ForbiddenException(Forbidden.PACKS_NOT_ENOUGH_TOKENS);

        const packBlooks = await this.dataService.getBlooksFromPack(dto.packId);

        // TODO: include booster chance
        const blookId = await openPack(pack.id, packBlooks, 1)
            .catch((err) => {
                if (err.message === NotFound.UNKNOWN_PACK) throw new NotFoundException(NotFound.UNKNOWN_PACK);
            });
        if (!blookId) throw new NotFoundException(NotFound.UNKNOWN_PACK);
        if (typeof blookId === "object") throw new InternalServerErrorException(InternalServerError.DEFAULT);

        // increment user's pack opened amount, and experience. insert blook to table. decrement user tokens
        await this.prismaService.$transaction(async (tx) => {
            await tx.user.update({ select: null, where: { id: userId }, data: { tokens: { decrement: pack.price } } });
            await tx.userStatistic.update({ select: null, where: { id: userId }, data: { packsOpened: { increment: 1 } } });
            await tx.userBlook.create({ select: null, data: { userId, initialObtainerId: userId, blookId, obtainedBy: BlookObtainMethod.PACK_OPEN } });
        });

        return blookId;
    }
}
