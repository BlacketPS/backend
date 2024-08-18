import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { User, UserStatistic, UserBlook, UserItem, MarketOpenPackDto, BlookObtainMethod, ItemObtainMethod, NotFound, Forbidden, openPack, Blook, InternalServerError } from "blacket-types";
import { Repository } from "sequelize-typescript";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { DataService } from "src/data/data.service";

@Injectable()
export class MarketService {
    private userRepo: Repository<User>;
    private userStatisticRepo: Repository<UserStatistic>;
    private userBlookRepo: Repository<UserBlook>;
    private userItemRepo: Repository<UserItem>;

    constructor(
        private sequelizeService: PrismaService,
        private redisService: RedisService,
        private dataService: DataService
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userStatisticRepo = this.sequelizeService.getRepository(UserStatistic);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
        this.userItemRepo = this.sequelizeService.getRepository(UserItem);
    }

    // as opening packs is one of the MOST intensive operations we do
    // i'll be probably optimising this a few times and doing performance measures
    async openPack(userId: string, dto: MarketOpenPackDto) {
        const pack = await this.redisService.getPack(dto.packId);
        if (!pack) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        if (!pack.enabled) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        const user = await this.userRepo.findOne({ attributes: ["tokens"], where: { id: userId } });

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
        const transaction = await this.sequelizeService.transaction();

        await this.userRepo.update({ tokens: this.sequelizeService.literal(`tokens - ${pack.price}`) }, { returning: false, where: { id: userId }, transaction },);
        await this.userStatisticRepo.update({ packsOpened: this.sequelizeService.literal("\"packsOpened\"+1") }, { returning: false, where: { id: userId }, transaction });
        await this.userBlookRepo.create({ userId, initalObtainerId: userId, blookId: blookId, obtainedBy: BlookObtainMethod.PACK_OPEN }, { returning: false, transaction });

        await transaction.commit();

        return blookId;
    }

    async gimmeItem(userId: string) {
        return await this.userItemRepo.create({ userId, itemId: 1, usesLeft: 1, initalObtainerId: userId, obtainedBy: ItemObtainMethod.ITEM_SHOP });
    }
}
