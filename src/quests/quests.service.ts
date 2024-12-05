import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { TokenDistribution, Forbidden } from "@blacket/types";
import { UsersService } from "src/users/users.service";

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
        private prismaService: PrismaService,
        private usersService: UsersService
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
        return -this.dailyTokensDistribution[0].amount;
    }

    async claimDailyTokens(userId: string): Promise<{ tokens: number }> {
        const user = await this.usersService.getUser(userId);

        return await this.prismaService.$transaction(async (tx) => {
            const lastClaimed = new Date(user.lastClaimed);

            const claimableDate = new Date();
            claimableDate.setUTCHours(0, 0, 0, 0);

            if (lastClaimed >= claimableDate) throw new ForbiddenException(Forbidden.QUESTS_DAILY_ALREADY_CLAIMED);

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
