import { ForbiddenException, Injectable } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { Repository } from "sequelize-typescript";
import { TokenDistribution, User } from "blacket-types";

@Injectable()
export class QuestsService {
    private userRepo: Repository<User>;
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

    constructor(private sequelizeService: SequelizeService) { }

    async onModuleInit() {
        this.userRepo = this.sequelizeService.getRepository(User);
    }

    private getRandomDailyTokens(): number {
        // math.random is inclusive 0 and exclusive 1
        const rand: number = Math.floor(Math.random() * this.dailyTokensDistributionTotalChance) + 1;

        let cumulativeChance: number = 0;
        for (const distribution of this.dailyTokensDistribution) {
            cumulativeChance += distribution.chance;
            if (rand <= cumulativeChance) return distribution.amount;
        }

        // this should never be reached, but just incase..
        return this.dailyTokensDistribution[0].amount;
    }

    claimDailyTokens(user: User): number {
        const lastDailyTokenClaim = new Date();
        lastDailyTokenClaim.setHours(0, 0, 0, 0);

        if (user.lastClaimed && user.lastClaimed >= lastDailyTokenClaim) throw new ForbiddenException("You have already claimed your daily tokens");

        const tokensToAdd = this.getRandomDailyTokens();

        this.userRepo.update({
            tokens: this.sequelizeService.literal(`tokens + ${tokensToAdd}`),
            lastClaimed: lastDailyTokenClaim
        }, { where: { id: user.id } });

        return tokensToAdd;
    }
}
