import { Controller, Get } from "@nestjs/common";
import { LeaderboardService } from "./leaderboard.service";
import { ApiTags } from "@nestjs/swagger";
import { LeaderboardEntity } from "blacket-types";

@ApiTags("leaderboard")
@Controller("leaderboard")
export class LeaderboardController {
    constructor(private leaderboardService: LeaderboardService) {}

    @Get()
    async getLeaderboard() {
        const leaderboard = await this.leaderboardService.getLeaderboard();

        return new LeaderboardEntity(leaderboard);
    }
}
