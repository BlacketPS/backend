import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { User, UserStatistic, UserBlook, UserItem, MarketOpenPackDto, BlookObtainMethod, ItemObtainMethod, NotFound, Forbidden } from "blacket-types";
import { Repository } from "sequelize-typescript";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { DataService } from "src/data/data.service";

@Injectable()
export class MarketService {
    private userRepo: Repository<User>;
    private userStatisticRepo: Repository<UserStatistic>;
    private userBlookRepo: Repository<UserBlook>;
    private userItemRepo: Repository<UserItem>;

    constructor(
        private sequelizeService: SequelizeService,
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

        const blooks = await this.dataService.getBlooksFromPack(dto.packId);
        if (!blooks.length) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        const totalChance = blooks.reduce((acc, curr) => acc + curr.chance, 0);
        if (totalChance <= 0) throw new NotFoundException(NotFound.UNKNOWN_PACK);

        let rand = Math.random() * totalChance;

        const blookIndex = blooks.findIndex((blook) => (rand -= blook.chance) < 0);
        const blook = blooks[blookIndex];

        // increment user's pack opened amount, and experience. insert blook to table. decrement user tokens
        const transaction = await this.sequelizeService.transaction();

        await this.userRepo.update({ tokens: this.sequelizeService.literal(`tokens - ${pack.price}`) }, { returning: false, where: { id: userId }, transaction },);
        await this.userStatisticRepo.update({ packsOpened: this.sequelizeService.literal("\"packsOpened\"+1") }, { returning: false, where: { id: userId }, transaction });
        await this.userBlookRepo.create({ userId, initalObtainerId: userId, blookId: blook.id, obtainedBy: BlookObtainMethod.PACK_OPEN }, { returning: false, transaction });

        await transaction.commit();

        return blook.id;
    }

    async gimmeItem(userId: string) {
        return await this.userItemRepo.create({ userId, itemId: 5, usesLeft: 6, initalObtainerId: userId, obtainedBy: ItemObtainMethod.ITEM_SHOP });
    }
}
