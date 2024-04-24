import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Pack, User, UserStatistic, UserBlook, OpenPackDto, Blook } from "blacket-types";
import { BlookObtainMethod } from "blacket-types/dist/models/userBlook.model";
import { Repository } from "sequelize-typescript";
import { RedisService } from "src/redis/redis.service";
import { SequelizeService } from "src/sequelize/sequelize.service";

@Injectable()
export class MarketService {
    private userRepo: Repository<User>;
    private userStatisticRepo: Repository<UserStatistic>;
    private userBlookRepo: Repository<UserBlook>;

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService
    ) {
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

        await this.userRepo.update({ tokens: this.sequelizeService.literal(`tokens-${pack.price}`) }, { returning: false, where: { id: userId }, transaction }, );
        await this.userStatisticRepo.update({ packsOpened: this.sequelizeService.literal("\"packsOpened\"+1") }, { returning: false, where: { id: userId }, transaction });
        await this.userBlookRepo.create({ userId, initalObtainerId: userId, blookId: blook.id, obtainedBy: BlookObtainMethod.PACK_OPEN }, { returning: false, transaction });

        await transaction.commit();

        return blook.id;
    }
}
