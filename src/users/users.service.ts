import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { hash } from "bcrypt";
import { DiscordAccessToken, DiscordDiscordUser, User } from "@blacket/types";
import { Font, PermissionType, Prisma, Resource, Title, OAuthType, PrismaClient, UserDiscord } from "@blacket/core";
import { DefaultArgs } from "@prisma/client/runtime/library";
import * as path from "path";
import * as fs from "fs";

export interface GetUserSettings {
    cacheUser?: boolean;
    includeBanners?: boolean;
    includeBlooksCurrent?: boolean;
    includeBlooksAll?: boolean;
    includeDiscord?: boolean;
    includeItemsCurrent?: boolean;
    includeItemsAll?: boolean;
    includePaymentMethods?: boolean;
    includeStatistics?: boolean;
    includeSettings?: boolean;
    includeTitles?: boolean;
    includeFonts?: boolean;
}

@Injectable()
export class UsersService implements OnApplicationBootstrap {
    private defaultPermissions: PermissionType[];
    private defaultAvatar: Resource;
    private defaultBanner: Resource;
    private defaultTitle: Title;
    private defaultFont: Font;

    constructor(
        private configService: ConfigService,
        private prismaService: PrismaService,
        private redisService: RedisService
    ) { }

    async onApplicationBootstrap() {
        this.defaultPermissions = [PermissionType.CREATE_REPORTS, PermissionType.CHANGE_USERNAME];

        this.defaultAvatar = await this.prismaService.resource.findUnique({ where: { reference: "DEFAULT_BLOOK" } });
        this.defaultBanner = await this.prismaService.resource.findUnique({ where: { reference: "DEFAULT_BANNER" } });
        this.defaultTitle = await this.prismaService.title.findUnique({ where: { id: 1 } });
        this.defaultFont = await this.prismaService.font.findUnique({ where: { id: 1 } });
    }

    async getUser(user: string, settings: GetUserSettings = {
        cacheUser: true
    }): Promise<User | null> {
        if (settings.cacheUser) {
            const cachedUser = await this.redisService.getKey("cachedUser", user.toLowerCase());

            if (cachedUser) return cachedUser;
        }

        const include: Prisma.UserInclude = {};

        if (settings.includeBanners) include.banners = true;
        if (settings.includeBlooksCurrent) include.blooks = {
            select: { blookId: true }, where: {
                sold: false,
                auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } }
            }
        };
        if (settings.includeBlooksAll) include.blooks = true;
        if (settings.includeItemsCurrent) include.items = {
            select: { id: true, itemId: true, usesLeft: true }, where: {
                usesLeft: { gt: 0 },
                auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } }
            }
        };
        if (settings.includeItemsAll) include.items = { select: { id: true, itemId: true, usesLeft: true } };
        if (settings.includeStatistics) include.statistics = true;
        if (settings.includeDiscord) include.discord = true;
        if (settings.includeTitles) include.titles = true;
        if (settings.includeFonts) include.fonts = true;
        if (settings.includeSettings) include.settings = true;
        if (settings.includePaymentMethods) include.paymentMethods = { omit: { paymentMethodId: true } };

        const userData = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { id: user },
                    { username: { equals: user, mode: "insensitive" } }
                ]
            },
            include: {
                customAvatar: true,
                customBanner: true,
                groups: {
                    include: {
                        group: true
                    }
                },
                ...include
            }
        });
        if (!userData) return null;

        if (settings.cacheUser) {
            await this.redisService.setKey("cachedUser", userData.id, userData, 10);
            await this.redisService.setKey("cachedUser", userData.username.toLowerCase(), userData, 10);
        }

        return userData;
    }

    async userExists(user: string): Promise<boolean> {
        const count = await this.prismaService.user.count({
            where: {
                OR: [
                    { id: user },
                    {
                        username: {
                            equals: user,
                            mode: "insensitive"
                        }
                    }
                ]
            }
        });

        return count > 0;
    }

    // TODO: make this a transaction as well? im not sure
    async createUser(username: string, password: string, transaction?: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<User> {
        const prisma = transaction || this.prismaService;

        const user = await prisma.user.create({
            data: {
                id: (Math.floor(Date.now() / 1000)).toString() + Math.floor(1000000 + Math.random() * 9000000).toString(),
                username,
                password: await hash(password, 10),
                avatarId: this.defaultAvatar.id,
                bannerId: this.defaultBanner.id,
                titleId: this.defaultTitle.id,
                fontId: this.defaultFont.id,
                permissions: this.defaultPermissions
            }
        });

        await prisma.userStatistic.create({ data: { id: user.id } });
        await prisma.userSetting.create({ data: { id: user.id } });

        return user;
    }

    async updateUserIp(user: User, ip: string, transaction?: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<void> {
        const prisma = transaction || this.prismaService;

        const ipAddress = await prisma.ipAddress.upsert({ where: { ipAddress: ip }, update: {}, create: { ipAddress: ip } });
        const userIpAddress = await prisma.userIpAddress.findFirst({ where: { userId: user.id, ipAddressId: ipAddress.id } })
            ?? await prisma.userIpAddress.create({ data: { userId: user.id, ipAddressId: ipAddress.id } });

        await prisma.userIpAddress.update({ data: { uses: { increment: 1 } }, where: { id: userIpAddress.id } });
        await prisma.user.update({ where: { id: user.id }, data: { ipAddress: ip } });
    }

    async linkDiscordOAuth(userId: string, accessTokenResponse: DiscordAccessToken, discordUser: DiscordDiscordUser): Promise<UserDiscord> {
        return await this.prismaService.$transaction(async (prisma) => {
            await prisma.userOAuth.create({
                data: {
                    user: { connect: { id: userId } },
                    accessToken: accessTokenResponse.access_token,
                    refreshToken: accessTokenResponse.refresh_token,
                    tokenType: accessTokenResponse.token_type,
                    scope: accessTokenResponse.scope,
                    expiresAt: new Date(Date.now() + accessTokenResponse.expires_in * 1000),
                    type: OAuthType.DISCORD
                }
            });

            const userDiscord = await prisma.userDiscord.create({
                data: {
                    user: { connect: { id: userId } },
                    discordId: discordUser.id,
                    username: discordUser.username,
                    avatar: discordUser.avatar
                }
            });

            return userDiscord;
        });
    }
}
