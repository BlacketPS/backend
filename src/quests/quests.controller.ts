import { Controller, Post } from "@nestjs/common";
import { QuestsService } from "./quests.service";
import { GetCurrentUser } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { User } from "blacket-types";

@ApiTags("quests")
@Controller("quests")
export class QuestsController {
    constructor(
        private readonly questsService: QuestsService
    ) { }

    @Post("claim-daily-tokens")
    claimDailyTokens(@GetCurrentUser() user: User) {
        return this.questsService.claimDailyTokens(user);
    }
}
