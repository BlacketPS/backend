import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class LeaderboardService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService
    ) { }

    async getLeaderboard() {
        const leaderboard = await this.redisService.getKey("leaderboard", "*");

        if (leaderboard) return leaderboard;
        else {
            const tokens = (await this.prismaService.user.findMany({
                orderBy: [{ tokens: "desc" }],
                include: { customAvatar: true },
                take: 10
            }));

            const experience = (await this.prismaService.user.findMany({
                orderBy: [{ experience: "desc" }],
                include: { customAvatar: true },
                take: 10
            }));

            await this.redisService.setKey("leaderboard", "*", { tokens, experience }, 300);

            return { tokens, experience };
        }
    }
}
