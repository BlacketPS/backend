import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { TokenDistribution, Forbidden } from "@blacket/types";

@Injectable()
export class QuestsService {
    private dailyTokensDistribution: TokenDistribution[] = [
        { chance: 30, amount: 500 },
        { chance: 23, amount: 550 },
        { chance: 22, amount: 600 },
        { chance: 20, amount: 650 },
        { chance: 15, amount: 700 },
        { chance: 10, amount: 800 },
        { chance: 7, amount: 900 },
        { chance: 5, amount: 1000 }
    ];
    private dailyTokensDistributionTotalChance = this.dailyTokensDistribution.reduce((acc, curr) => acc + curr.chance, 0);

    constructor(
        private readonly prismaService: PrismaService
    ) { }

    private getRandomDailyTokens(): number {
        // math.random is inclusive 0 and exclusive 1
        const rand: number = Math.floor(Math.random() * this.dailyTokensDistributionTotalChance) + 1;

        let cumulativeChance: number = 0;
        for (const distribution of this.dailyTokensDistribution) {
            cumulativeChance += distribution.chance;

            if (rand <= cumulativeChance) return distribution.amount;
        }

        // this should never be reached, but just incase...
        return this.dailyTokensDistribution[0].amount;
    }

    async claimDailyTokens(userId: string): Promise<{ tokens: number }> {
        return await this.prismaService.$transaction(async (tx) => {
            const claimableDate = new Date();
            claimableDate.setUTCHours(0, 0, 0, 0);

            const alreadyClaimed = await tx.user.count({
                where: {
                    id: userId,
                    lastClaimed: {
                        gte: claimableDate
                    }
                }
            });
            if (alreadyClaimed) throw new ForbiddenException(Forbidden.QUESTS_DAILY_ALREADY_CLAIMED);

            const tokensToAdd = this.getRandomDailyTokens();

            await tx.user.update({
                where: { id: userId },
                data: {
                    tokens: {
                        increment: tokensToAdd
                    },
                    lastClaimed: claimableDate
                }
            });

            return { tokens: tokensToAdd };
        });
    }
}
