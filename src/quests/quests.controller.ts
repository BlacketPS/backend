import { Controller, Put } from "@nestjs/common";
import { QuestsService } from "./quests.service";
import { GetCurrentUser } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("quests")
@Controller("quests")
export class QuestsController {
    constructor(
        private readonly questsService: QuestsService
    ) { }

    @Put("claim-daily-tokens")
    claimDailyTokens(@GetCurrentUser() userId: string) {
        return this.questsService.claimDailyTokens(userId);
    }
}
