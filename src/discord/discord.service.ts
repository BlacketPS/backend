import { HttpService } from "@nestjs/axios";
import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiscordAccessToken, DiscordLinkDto, DiscordDiscordUser, Unauthorized, InternalServerError } from "@blacket/types";
import { UsersService } from "src/users/users.service";

@Injectable()
export class DiscordService {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly httpService: HttpService
    ) { }

    async getOAuthAccessTokenResponse(dto: DiscordLinkDto): Promise<DiscordAccessToken> {
        if (!dto.code) throw new UnauthorizedException(Unauthorized.DEFAULT);

        try {
            const data = await this.httpService.axiosRef.post("https://discord.com/api/oauth2/token", {
                client_id: this.configService.get<string>("VITE_DISCORD_CLIENT_ID"),
                client_secret: this.configService.get<string>("SERVER_DISCORD_CLIENT_SECRET"),
                scope: "identify",
                grant_type: "authorization_code",
                code: dto.code,
                redirect_uri: encodeURI(this.configService.get<string>("SERVER_BASE_URL") + "/settings/link-discord")
            }, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            return data.data as DiscordAccessToken;
        } catch (err) {
            throw new InternalServerErrorException(err.message ?? InternalServerError.DEFAULT);
        }
    }

    async getDiscordUser(accessTokenResponse: DiscordAccessToken): Promise<DiscordDiscordUser> {
        try {
            const data = await this.httpService.axiosRef.get("https://discord.com/api/users/@me", {
                headers: {
                    Authorization: `${accessTokenResponse.token_type} ${accessTokenResponse.access_token}`
                }
            });

            return data.data as DiscordDiscordUser;
        } catch {
            throw new InternalServerErrorException(InternalServerError.DEFAULT);
        }
    }

    async linkAccount(userId: string, accessTokenResponse: DiscordAccessToken, discordUser: DiscordDiscordUser): Promise<void> {
        try {
            await this.usersService.linkDiscordOAuth(userId, accessTokenResponse, discordUser);
        } catch {
            throw new InternalServerErrorException(InternalServerError.DEFAULT);
        }
    }
}
