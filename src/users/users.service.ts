import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { PermissionsService } from "src/permissions/permissions.service";
import { hash } from "bcrypt";
import { DiscordAccessToken, DiscordDiscordUser } from "blacket-types";
import { Font, PermissionType, Prisma, Resource, Title, User, OAuthType } from "@prisma/client";

export interface GetUserSettings {
    cacheUser?: boolean;
    includeBlooksCurrent?: boolean;
    includeBlooksAll?: boolean;
    includeItemsCurrent?: boolean;
    includeItemsAll?: boolean;
    includeTitles?: boolean;
    includeBanners?: boolean;
    includeStatistics?: boolean;
    includeDiscord?: boolean;
    includeSettings?: boolean;
    includePaymentMethods?: boolean;
}

@Injectable()
export class UsersService implements OnApplicationBootstrap {
    private defaultPermissions: PermissionType[];
    private defaultAvatar: Resource;
    private defaultBanner: Resource;
    private defaultTitle: Title;
    private defaultFont: Font;

    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private permissionsService: PermissionsService
    ) { }

    async onApplicationBootstrap() {
        this.defaultPermissions = [PermissionType.CREATE_REPORTS, PermissionType.CHANGE_USERNAME];
        this.defaultAvatar = await this.prismaService.resource.findUnique({ where: { id: 1 } });
        this.defaultBanner = await this.prismaService.resource.findUnique({ where: { id: 3 } });
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

        /* const include = [];

        if (settings.includeBanners) include.push({ model: this.userBannerRepo, as: "banners", attributes: { exclude: [this.userBannerRepo.primaryKeyAttribute] } });
        if (settings.includeBlooksCurrent) include.push({ model: this.userBlookRepo, as: "blooks", attributes: ["blookId"], where: { sold: false }, required: false });
        if (settings.includeBlooksAll) include.push({ model: this.userBlookRepo, as: "blooks", attributes: ["blookId"], required: false });
        if (settings.includeItemsCurrent) include.push({ model: this.userItemRepo, as: "items", attributes: ["id", "itemId", "usesLeft"], where: { usesLeft: { [Op.gt]: 0 } }, required: false });
        if (settings.includeItemsAll) include.push({ model: this.userItemRepo, as: "items", attributes: ["id", "itemId", "usesLeft"], required: false });
        if (settings.includeStatistics) include.push({ model: this.userStatisticRepo, as: "statistics", attributes: { exclude: [this.userStatisticRepo.primaryKeyAttribute] } });
        if (settings.includeDiscord) include.push({ model: this.userDiscordRepo, as: "discord", attributes: { exclude: ["userId"] }, required: false });
        if (settings.includeTitles) include.push({ model: this.userTitleRepo, as: "titles", attributes: { exclude: [this.userTitleRepo.primaryKeyAttribute] } });
        if (settings.includeSettings) include.push({ model: this.userSettingRepo, as: "settings", attributes: { exclude: [this.userSettingRepo.primaryKeyAttribute] } });
        if (settings.includePaymentMethods) include.push({ model: this.userPaymentMethodRepo, as: "paymentMethods", attributes: { exclude: ["userId", "squareCustomerId", "squarePaymentMethodId"] }, required: false });

        const userData = await this.userRepo.findOne({
            where: this.sequelizeService.or({ id: user }, { username: { [Op.iLike]: user } }),
            include: [
                { model: this.userGroupRepo, as: "groups", include: [this.groupRepo], required: false },
                ...include
            ]
        }); */

        const include: Prisma.UserInclude = {};

        if (settings.includeBanners) include.banners = true;
        if (settings.includeBlooksCurrent) include.blooks = { select: { blookId: true }, where: { sold: false } };
        if (settings.includeBlooksAll) include.blooks = true;
        if (settings.includeItemsCurrent) include.items = { select: { id: true, itemId: true, usesLeft: true }, where: { usesLeft: { gt: 0 } } };
        if (settings.includeItemsAll) include.items = { select: { id: true, itemId: true, usesLeft: true } };
        if (settings.includeStatistics) include.statistics = true;
        if (settings.includeDiscord) include.discord = true;
        if (settings.includeTitles) include.titles = true;
        if (settings.includeSettings) include.settings = true;
        if (settings.includePaymentMethods) include.paymentMethods = true;

        const userData = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { id: user },
                    { username: user }
                ]
            },
            include: {
                groups: true,
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
                    { username: user }
                ]
            }
        });

        return count > 0;
    }

    async createUser(username: string, password: string): Promise<User> {
        const user = await this.prismaService.user.create({
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
        await this.prismaService.userStatistic.create({ data: { id: user.id } });
        await this.prismaService.userSetting.create({ data: { id: user.id } });

        return user;
    }

    async updateUserIp(user: User, ip: string): Promise<void> {
        const ipAddress = await this.prismaService.ipAddress.upsert({ where: { ipAddress: ip }, update: {}, create: { ipAddress: ip } });
        const userIpAddress = await this.prismaService.userIpAddress.upsert({ where: { userId: user.id, ipAddressId: ipAddress.id }, update: {}, create: { userId: user.id, ipAddressId: ipAddress.id } });

        await this.prismaService.userIpAddress.update({ data: { uses: { increment: 1 } }, where: { id: userIpAddress.id } });
        await this.prismaService.user.update({ where: { id: user.id }, data: { ipAddress: ip } });
    }

    async linkDiscordOAuth(userId: string, accessTokenResponse: DiscordAccessToken, discordUser: DiscordDiscordUser): Promise<void> {
        await this.prismaService.$transaction([
            this.prismaService.userOAuth.create({
                data: {
                    userId,
                    accessToken: accessTokenResponse.access_token,
                    refreshToken: accessTokenResponse.refresh_token,
                    tokenType: accessTokenResponse.token_type,
                    scope: accessTokenResponse.scope,
                    expiresAt: new Date(Date.now() + accessTokenResponse.expires_in * 1000),
                    type: OAuthType.DISCORD
                }
            }),
            this.prismaService.userDiscord.create({
                data: {
                    userId,
                    discordId: discordUser.id,
                    username: discordUser.username,
                    avatar: discordUser.avatar
                }
            })
        ]);
    }

    async addTokens(userId: User["id"], amount: number): Promise<void> {
        await this.prismaService.user.update({ where: { id: userId }, data: { tokens: { increment: amount } } });
    }
}
