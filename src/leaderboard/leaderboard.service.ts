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
            const diamonds = (await this.prismaService.user.findMany({
                orderBy: [{ diamonds: "desc" }],
                select: { id: true },
                take: 10
            })).map((u) => u.id);

            const experience = (await this.prismaService.user.findMany({
                orderBy: [{ experience: "desc" }],
                select: { id: true },
                take: 10
            })).map((u) => u.id);

            await this.redisService.setKey("leaderboard", "*", { diamonds, experience }, 60);

            return { diamonds, experience };
        }
    }
}
