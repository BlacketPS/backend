import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { MarketOpenPackDto, NotFound, Forbidden, openPack, InternalServerError } from "@blacket/types";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { DataKey, DataService } from "src/data/data.service";
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
        const rarities = await this.redisService.getAllFromKey(DataKey.RARITY);

        // TODO: include booster chance
        const blooks = await openPack(packBlooks, rarities, 1, 1, 500)
            .catch((err) => {
                if (err.message === NotFound.UNKNOWN_PACK) throw new NotFoundException(NotFound.UNKNOWN_PACK);
            });
        if (!blooks) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        // increment user's pack opened amount, and experience. insert blook to table. decrement user tokens
        let blook;

        await this.prismaService.$transaction(async (tx) => {
            await tx.user.update({ select: null, where: { id: userId }, data: { tokens: { decrement: pack.price } } });
            await tx.userStatistic.update({ select: null, where: { id: userId }, data: { packsOpened: { increment: 1 } } });

            const blookId = blooks[0].blookId;
            const shiny = blooks[0].shiny;

            const currentCount = await tx.userBlook.count({ where: { blookId, shiny } });
            const nextSerial = currentCount + 1;

            blook = await tx.userBlook.create({ select: null, data: { userId, initialObtainerId: userId, blookId, shiny, obtainedBy: BlookObtainMethod.PACK_OPEN, serial: nextSerial } });
        });

        return blook;
    }
}
