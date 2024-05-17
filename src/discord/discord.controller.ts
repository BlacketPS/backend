import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DiscordService } from "./discord.service";
import { GetCurrentUser } from "src/core/decorator";
import { DiscordLinkDto, IAccessToken, IDiscordUser, User } from "blacket-types";

@ApiTags("discord")
@Controller("discord")
export class DiscordController {
    constructor(private discordService: DiscordService) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("link")
    async linkAccount(@GetCurrentUser() userId: User["id"], @Body() dto: DiscordLinkDto): Promise<IDiscordUser> {
        const accessTokenResponse: IAccessToken = await this.discordService.getOAuthAccessTokenResponse(dto);

        const discordUser: IDiscordUser = await this.discordService.getDiscordUser(accessTokenResponse);

        await this.discordService.linkAccount(userId, accessTokenResponse, discordUser);

        return discordUser;
    }
}
