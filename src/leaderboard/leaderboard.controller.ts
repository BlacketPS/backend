import { Controller, Get } from "@nestjs/common";
import { LeaderboardService } from "./leaderboard.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("leaderboard")
@Controller("leaderboard")
export class LeaderboardController {
    constructor(private leaderboardService: LeaderboardService) { }

    @Get()
    async getLeaderboard() {
        return await this.leaderboardService.getLeaderboard();
    }
}
