import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OpenPackDto } from "blacket-types";
import { Repository } from "sequelize-typescript";
import { Blook, Pack, User, UserBlook, UserStatistic } from "src/models";
import { BlookObtainMethod } from "src/models/userBlook.model";
import { RedisService } from "src/redis/redis.service";
import { SequelizeService } from "src/sequelize/sequelize.service";

@Injectable()
export class MarketService {
    private packRepo: Repository<Pack>;
    private userRepo: Repository<User>;
    private userStatisticRepo: Repository<UserStatistic>;
    private userBlookRepo: Repository<UserBlook>;

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService
    ) {
        this.packRepo = this.sequelizeService.getRepository(Pack);
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userStatisticRepo = this.sequelizeService.getRepository(UserStatistic);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
    }

    // as opening packs is one of the MOST intensive operations we do
    // i'll be probably optimising this a few times and doing performance measures
    async openPack(userId: string, packDto: OpenPackDto) {
        if (!this.redisService.exists(`blacket-pack:${packDto.packId}`)) throw new NotFoundException("Pack not found");
        const pack: Pack = JSON.parse(await this.redisService.get(`blacket-pack:${packDto.packId}`)) as Pack;

        if (!pack.enabled) throw new NotFoundException("Pack not found");

        const user: User = await this.userRepo.findOne({
            attributes: ["tokens"],
            where: {
                id: userId
            }
        });

        if (user.tokens < pack.price) throw new ForbiddenException("Not enough tokens");

        const blooks: Blook[] = pack.blooks as Blook[];

        const totalChance: number = blooks.reduce((acc, curr) => acc + curr.chance, 0);
        let rand: number = Math.random() * totalChance;

        const blookIndex: number = blooks.findIndex((blook) => (rand -= blook.chance) < 0);
        const blook = blooks[blookIndex];

        // increment user's pack opened amount, and experience. insert blook to table. decrement user tokens
        const transaction = await this.sequelizeService.transaction();

        await this.userRepo.decrement({ tokens: pack.price }, { where: { id: userId }, transaction });
        await this.userStatisticRepo.increment({ packsOpened: 1 }, { where: { id: userId }, transaction });
        await this.userBlookRepo.create({ userId, initalObtainerId: userId, blookId: blook.id, obtainedBy: BlookObtainMethod.PACK_OPEN });

        await transaction.commit();

        return blook.id;
    }
}
