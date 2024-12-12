import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DiscordService } from "./discord.service";
import { GetCurrentUser } from "src/core/decorator";
import { DiscordLinkDto, DiscordAccessToken, DiscordDiscordUser } from "@blacket/types";

@ApiTags("discord")
@Controller("discord")
export class DiscordController {
    constructor(private discordService: DiscordService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("link")
    async linkAccount(@GetCurrentUser() userId: string, @Body() dto: DiscordLinkDto): Promise<DiscordDiscordUser> {
        const accessTokenResponse: DiscordAccessToken = await this.discordService.getOAuthAccessTokenResponse(dto);

        const discordUser: DiscordDiscordUser = await this.discordService.getDiscordUser(accessTokenResponse);

        await this.discordService.linkAccount(userId, accessTokenResponse, discordUser);

        return discordUser;
    }
}
