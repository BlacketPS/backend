import { Injectable, InternalServerErrorException, OnApplicationBootstrap } from "@nestjs/common";
import { Repository } from "sequelize-typescript";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { PermissionsService } from "src/permissions/permissions.service";
import { hash } from "bcrypt";
import { Op, type Transaction } from "sequelize";
import { PermissionType, OAuthType, UserDiscord, UserOauth, User, UserTitle, UserBanner, UserBlook, UserItem, UserStatistic, UserSetting, IpAddress, UserIpAddress, Title, Font, Resource, DiscordAccessToken, DiscordDiscordUser, InternalServerError, UserPaymentMethod, UserGroup, Group } from "blacket-types";

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
    private userRepo: Repository<User>;
    private userOauthRepo: Repository<UserOauth>;
    private userDiscordRepo: Repository<UserDiscord>;
    private userTitleRepo: Repository<UserTitle>;
    private userBannerRepo: Repository<UserBanner>;
    private userBlookRepo: Repository<UserBlook>;
    private userItemRepo: Repository<UserItem>;
    private userStatisticRepo: Repository<UserStatistic>;
    private userSettingRepo: Repository<UserSetting>;
    private userGroupRepo: Repository<UserGroup>;
    private userPaymentMethodRepo: Repository<UserPaymentMethod>;
    private ipAddressRepo: Repository<IpAddress>;
    private userIpAddressRepo: Repository<UserIpAddress>;
    private titleRepo: Repository<Title>;
    private fontRepo: Repository<Font>;
    private resourceRepo: Repository<Resource>;
    private groupRepo: Repository<Group>;

    private defaultPermissions: PermissionType[];
    private defaultAvatar: Resource;
    private defaultBanner: Resource;
    private defaultTitle: Title;
    private defaultFont: Font;

    constructor(
        private sequelizeService: PrismaService,
        private redisService: RedisService,
        private permissionsService: PermissionsService
    ) { }

    async onApplicationBootstrap() {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userOauthRepo = this.sequelizeService.getRepository(UserOauth);
        this.userDiscordRepo = this.sequelizeService.getRepository(UserDiscord);
        this.userTitleRepo = this.sequelizeService.getRepository(UserTitle);
        this.userBannerRepo = this.sequelizeService.getRepository(UserBanner);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
        this.userItemRepo = this.sequelizeService.getRepository(UserItem);
        this.userStatisticRepo = this.sequelizeService.getRepository(UserStatistic);
        this.userSettingRepo = this.sequelizeService.getRepository(UserSetting);
        this.userGroupRepo = this.sequelizeService.getRepository(UserGroup);
        this.userPaymentMethodRepo = this.sequelizeService.getRepository(UserPaymentMethod);
        this.ipAddressRepo = this.sequelizeService.getRepository(IpAddress);
        this.userIpAddressRepo = this.sequelizeService.getRepository(UserIpAddress);
        this.titleRepo = this.sequelizeService.getRepository(Title);
        this.fontRepo = this.sequelizeService.getRepository(Font);
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
        this.groupRepo = this.sequelizeService.getRepository(Group);

        this.defaultPermissions = [PermissionType.CREATE_REPORTS, PermissionType.CHANGE_USERNAME];
        this.defaultAvatar = await this.resourceRepo.findOne({ where: { id: 1 } });
        this.defaultBanner = await this.resourceRepo.findOne({ where: { id: 3 } });
        this.defaultTitle = await this.titleRepo.findOne({ where: { id: 1 } });
        this.defaultFont = await this.fontRepo.findOne({ where: { id: 1 } });
    }

    async getUser(user: string, settings: GetUserSettings = {
        cacheUser: true
    }): Promise<User | null> {
        if (settings.cacheUser) {
            const cachedUser = await this.redisService.getKey("cachedUser", user.toLowerCase());

            if (cachedUser) return cachedUser;
        }

        const include = [];

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
        });
        if (!userData) return null;

        if (settings.cacheUser) {
            await this.redisService.setKey("cachedUser", userData.id, userData, 10);
            await this.redisService.setKey("cachedUser", userData.username.toLowerCase(), userData, 10);
        }

        return userData;
    }

    async userExists(user: string, transaction?: Transaction): Promise<boolean> {
        const count = await this.userRepo.count({ where: this.sequelizeService.or({ id: user }, { username: user }), transaction });

        return count > 0;
    }

    // transactions are goofy, if you don't use a current transaction you'll get a fk constraint error.
    async createUser(username: string, password: string, transaction?: Transaction): Promise<User> {
        const user = await this.userRepo.create({
            username: username,
            password: await hash(password, 10),
            avatarId: this.defaultAvatar.id,
            bannerId: this.defaultBanner.id,
            titleId: this.defaultTitle.id,
            fontId: this.defaultFont.id,
            permissions: this.defaultPermissions
        }, { transaction });

        await this.userStatisticRepo.create({ id: user.id }, { transaction });
        await this.userSettingRepo.create({ id: user.id }, { transaction });

        return user;
    }

    async updateUserIp(user: User, ip: string, transaction?: Transaction): Promise<void> {
        const [ipAddress] = await this.ipAddressRepo.findOrCreate({ where: { ipAddress: ip }, defaults: { ipAddress: ip }, transaction });
        const [userIpAddress] = await this.userIpAddressRepo.findOrCreate({ where: { userId: user.id, ipAddressId: ipAddress.id }, defaults: { userId: user.id, ipAddressId: ipAddress.id }, transaction });

        await this.userIpAddressRepo.increment("uses", { where: { id: userIpAddress.id }, transaction });
        await this.userRepo.update({ ipAddress: ip }, { where: { id: user.id }, transaction });
    }

    async linkDiscordOAuth(userId: string, accessTokenResponse: DiscordAccessToken, discordUser: DiscordDiscordUser): Promise<void> {
        const transaction: Transaction = await this.sequelizeService.transaction();

        await this.userOauthRepo.create({
            userId,
            accessToken: accessTokenResponse.access_token,
            refreshToken: accessTokenResponse.refresh_token,
            tokenType: accessTokenResponse.token_type,
            scope: accessTokenResponse.scope,
            expiresAt: new Date(Date.now() + accessTokenResponse.expires_in * 1000),
            type: OAuthType.DISCORD,
            createdAt: new Date()
        }, { transaction });

        await this.userDiscordRepo.create({
            userId,
            discordId: discordUser.id,
            username: discordUser.username,
            avatar: discordUser.avatar
        }, { transaction });

        await transaction.commit().catch(() => {
            transaction.rollback();
            throw new InternalServerErrorException(InternalServerError.DEFAULT);
        });
    }

    async addTokens(userId: User["id"], amount: number, transaction?: Transaction): Promise<void> {
        await this.userRepo.increment("tokens", { by: amount, where: { id: userId }, transaction });
    }
}
