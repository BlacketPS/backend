import { Injectable } from "@nestjs/common";
import { Repository } from "sequelize-typescript";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { Resource, User } from "blacket-types";

@Injectable()
export class LeaderboardService {
    private userRepo: Repository<User>;
    private resourceRepo: Repository<Resource>;

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
    }

    async getLeaderboard() {
        if (await this.redisService.exists("blacket-leaderboard")) {
            const leaderboard = JSON.parse(await this.redisService.get("blacket-leaderboard"));

            return leaderboard;
        } else {
            const tokens = (await this.userRepo.findAll({
                order: [["tokens", "DESC"]],
                attributes: ["id", "username", "titleId", "avatarId", "color", "tokens"],
                include: [
                    { model: this.resourceRepo, as: "customAvatar" }
                ],
                limit: 10
            })).map((user) => user.toJSON());

            const experience = (await this.userRepo.findAll({
                order: [["experience", "DESC"]],
                attributes: ["id", "username", "titleId", "avatarId", "color", "experience"],
                include: [
                    { model: this.resourceRepo, as: "customAvatar" }
                ],
                limit: 10
            })).map((user) => user.toJSON());

            await this.redisService.setex("blacket-leaderboard", 300, JSON.stringify({ tokens, experience }));

            return { tokens, experience };
        }
    }
}
