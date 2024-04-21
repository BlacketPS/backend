import { Controller, Post } from "@nestjs/common";
import { QuestsService } from "./quests.service";
import { GetCurrentUser } from "src/core/decorator";
import { User } from "src/models";

@Controller("quests")
export class QuestsController {
    constructor(private readonly questsService: QuestsService) { }

    @Post("claim-daily-tokens")
    claimDailyTokens(@GetCurrentUser() user: User) {
        return this.questsService.claimDailyTokens(user);
    }
}
