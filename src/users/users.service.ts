import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { hash } from "bcrypt";
import { DiscordAccessToken, DiscordDiscordUser, User } from "@blacket/types";
import { Font, PermissionType, Prisma, Title, OAuthType, UserDiscord } from "@blacket/core";

export interface GetUserSettings {
    cacheUser?: boolean;
    includeBanners?: boolean;
    includeBlooksCurrent?: boolean;
    includeBlooksAll?: boolean;
    includeDiscord?: boolean;
    includeItemsCurrent?: boolean;
    includeItemsAll?: boolean;
    includePaymentMethods?: boolean;
    includeSubscription?: boolean;
    includeStatistics?: boolean;
    includeSettings?: boolean;
    includeTitles?: boolean;
    includeFonts?: boolean;
    includeRooms?: boolean;
}

@Injectable()
export class UsersService implements OnApplicationBootstrap {
    private defaultPermissions: PermissionType[];
    private defaultTitle: Title;
    private defaultFont: Font;

    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService
    ) { }

    async onApplicationBootstrap() {
        this.defaultPermissions = [PermissionType.CREATE_REPORTS, PermissionType.CHANGE_USERNAME];

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
            select: {
                id: true,
                blookId: true,
                shiny: true,
                serial: true,
                createdAt: true,
                updatedAt: true
            },
            where: {
                sold: false,
                auctions: { none: { AND: [{ buyerId: null }, { delistedAt: null }] } }
            }
        };
        if (settings.includeBlooksAll) include.blooks = true;
        if (settings.includeItemsCurrent) include.items = {
            select: {
                id: true,
                itemId: true,
                usesLeft: true,
                createdAt: true,
                updatedAt: true
            },
            where: {
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
        if (settings.includeSubscription) include.subscription = {
            omit: {
                stripeSubscriptionId: true,
                userId: true
            }
        };
        if (settings.includeRooms) include.rooms = { omit: { public: true } };

        const userData = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { id: user },
                    { username: { equals: user, mode: "insensitive" } }
                ]
            },
            include: {
                avatar: {
                    include: { blook: true }
                },
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

    async createUser(username: string, password: string, ip: string): Promise<User> {
        return await this.prismaService.$transaction(async (tx) => {
            const ipAddress = await tx.ipAddress.upsert({ where: { ipAddress: ip }, update: {}, create: { ipAddress: ip } });

            const user = await tx.user.create({
                data: {
                    id: (Math.floor(Date.now() / 1000)).toString() + Math.floor(1000000 + Math.random() * 9000000).toString(),
                    username,
                    password: await hash(password, 10),
                    titleId: this.defaultTitle.id,
                    fontId: this.defaultFont.id,
                    permissions: this.defaultPermissions,

                    ipAddressId: ipAddress.id
                }
            });

            await tx.userStatistic.create({ data: { id: user.id } });
            await tx.userSetting.create({ data: { id: user.id } });

            return user;
        });
    }

    async updateUserIp(user: User, ip: string): Promise<void> {
        return await this.prismaService.$transaction(async (tx) => {
            const ipAddress = await tx.ipAddress.upsert({ where: { ipAddress: ip }, update: {}, create: { ipAddress: ip } });

            const userIpAddress = await tx.userIpAddress.findFirst({ where: { userId: user.id, ipAddressId: ipAddress.id } })
                ?? await tx.userIpAddress.create({ data: { userId: user.id, ipAddressId: ipAddress.id } });

            await tx.userIpAddress.update({ data: { uses: { increment: 1 } }, where: { id: userIpAddress.id } });
            await tx.user.update({ where: { id: user.id }, data: { ipAddress: { connect: { id: ipAddress.id } } } });
        });
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
