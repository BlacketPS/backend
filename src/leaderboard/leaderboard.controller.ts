import { Controller, Get } from "@nestjs/common";
import { LeaderboardService } from "./leaderboard.service";
import { ApiTags } from "@nestjs/swagger";
import { User } from "@blacket/core";
import { PublicUser } from "@blacket/types";

@ApiTags("leaderboard")
@Controller("leaderboard")
export class LeaderboardController {
    constructor(private leaderboardService: LeaderboardService) {}

    @Get()
    async getLeaderboard() {
        const leaderboard = await this.leaderboardService.getLeaderboard();

        return {
            tokens: leaderboard.tokens.map((user: User) => new PublicUser(user)),
            experience: leaderboard.experience.map((user: User) => new PublicUser(user))
        };
    }
}
