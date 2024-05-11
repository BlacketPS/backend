import { Injectable } from "@nestjs/common";
import { Repository } from "sequelize-typescript";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { hash } from "bcrypt";
import { Op, type Transaction } from "sequelize";
import { User, UserTitle, UserBanner, UserBlook, UserStatistic, UserSetting, IpAddress, UserIpAddress, Title, Font, Resource } from "blacket-types";

export interface GetUserSettings {
    cacheUser?: boolean;
    includeBlooks?: boolean;
    includeTitles?: boolean;
    includeBanners?: boolean;
    includeStatistics?: boolean;
    includeSettings?: boolean;
}

@Injectable()
export class UsersService {
    private userRepo: Repository<User>;
    private userTitleRepo: Repository<UserTitle>;
    private userBannerRepo: Repository<UserBanner>;
    private userBlookRepo: Repository<UserBlook>;
    private userStatisticRepo: Repository<UserStatistic>;
    private userSettingRepo: Repository<UserSetting>;
    private ipAddressRepo: Repository<IpAddress>;
    private userIpAddressRepo: Repository<UserIpAddress>;
    private titleRepo: Repository<Title>;
    private fontRepo: Repository<Font>;
    private resourceRepo: Repository<Resource>;

    private defaultAvatar: Resource;
    private defaultBanner: Resource;
    private defaultTitle: Title;
    private defaultFont: Font;

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService
    ) { }

    async onModuleInit() {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userTitleRepo = this.sequelizeService.getRepository(UserTitle);
        this.userBannerRepo = this.sequelizeService.getRepository(UserBanner);
        this.userBlookRepo = this.sequelizeService.getRepository(UserBlook);
        this.userStatisticRepo = this.sequelizeService.getRepository(UserStatistic);
        this.userSettingRepo = this.sequelizeService.getRepository(UserSetting);
        this.ipAddressRepo = this.sequelizeService.getRepository(IpAddress);
        this.userIpAddressRepo = this.sequelizeService.getRepository(UserIpAddress);
        this.titleRepo = this.sequelizeService.getRepository(Title);
        this.fontRepo = this.sequelizeService.getRepository(Font);
        this.resourceRepo = this.sequelizeService.getRepository(Resource);

        this.defaultAvatar = await this.resourceRepo.findOne({ where: { id: 1 } });
        this.defaultBanner = await this.resourceRepo.findOne({ where: { id: 2 } });
        this.defaultTitle = await this.titleRepo.findOne({ where: { id: 1 } });
        this.defaultFont = await this.fontRepo.findOne({ where: { id: 1 } });
    }

    async getUser(user: string, settings: GetUserSettings = {
        cacheUser: true
    }) {
        if (settings.cacheUser) {
            const cachedUser = await this.redisService.get(`blacket-userCached:${user.toLowerCase()}`);

            if (cachedUser) return JSON.parse(cachedUser);
        }

        const include = [];

        if (settings.includeBanners) include.push({ model: this.userBannerRepo, as: "banners", attributes: { exclude: [this.userBannerRepo.primaryKeyAttribute] } });
        if (settings.includeBlooks) include.push({ model: this.userBlookRepo, as: "blooks", attributes: UserBlook["blookId"] });
        if (settings.includeStatistics) include.push({ model: this.userStatisticRepo, as: "statistics", attributes: { exclude: [this.userStatisticRepo.primaryKeyAttribute] } });
        if (settings.includeTitles) include.push({ model: this.userTitleRepo, as: "titles", attributes: { exclude: [this.userTitleRepo.primaryKeyAttribute] } });
        if (settings.includeSettings) include.push({ model: this.userSettingRepo, as: "settings", attributes: { exclude: [this.userSettingRepo.primaryKeyAttribute] } });

        const userData: User = await this.userRepo.findOne({
            where: this.sequelizeService.or({ id: user }, { username: { [Op.iLike]: user } }),
            attributes: {
                exclude: [
                    "avatarId",
                    "customAvatarId",
                    "bannerId",
                    "customBannerId"
                ]
            },
            include: [
                { model: this.resourceRepo, as: "avatar" },
                { model: this.resourceRepo, as: "banner" },
                { model: this.resourceRepo, as: "customAvatar" },
                { model: this.resourceRepo, as: "customBanner" },
                ...include
            ]
        });

        if (!userData) return null;

        if (settings.cacheUser) {
            await this.redisService.setex(`blacket-userCached:${userData.id}`, 10, JSON.stringify(userData));
            await this.redisService.setex(`blacket-userCached:${userData.username.toLowerCase()}`, 10, JSON.stringify(userData));
        }

        return userData;
    }

    async userExists(user: string, transaction?: Transaction): Promise<boolean> {
        const count = await this.userRepo.count({ where: this.sequelizeService.or({ id: user }, { username: user }), transaction });

        return count > 0;
    }

    // transactions are goofy, if you don't use a current transaction you'll get a fk constraint error

    async createUser(username: string, password: string, transaction?: Transaction): Promise<User> {
        const user = await this.userRepo.create({
            username: username,
            password: await hash(password, 10),
            avatarId: this.defaultAvatar.id,
            bannerId: this.defaultBanner.id,
            titleId: this.defaultTitle.id,
            fontId: this.defaultFont.id
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

    async addTokens(userId: User["id"], amount: number, transaction?: Transaction): Promise<void> {
        await this.userRepo.increment("tokens", { by: amount, where: { id: userId }, transaction });
    }
}
