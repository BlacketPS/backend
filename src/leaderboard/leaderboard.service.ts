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
        const leaderboard = await this.redisService.getKey("leaderboard", "*");

        if (leaderboard) return leaderboard;
        else {
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

            await this.redisService.setKey("leaderboard", "*", { tokens, experience }, 300);

            return { tokens, experience };
        }
    }
}
