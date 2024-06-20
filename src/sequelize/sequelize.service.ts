import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/redis/redis.service";
import { Repository, Sequelize } from "sequelize-typescript";
import { BlacketLoggerService } from "src/core/logger/logger.service";
import * as Models from "blacket-types/dist/models";

import { RarityAnimationType } from "blacket-types";

@Injectable()
export class SequelizeService extends Sequelize implements OnModuleInit {
    private sessionRepo: Repository<Models.Session>;
    private resourceRepo: Repository<Models.Resource>;
    private roomRepo: Repository<Models.Room>;
    private blookRepo: Repository<Models.Blook>;
    private rarityRepo: Repository<Models.Rarity>;
    private packRepo: Repository<Models.Pack>;
    private itemRepo: Repository<Models.Item>;
    private titleRepo: Repository<Models.Title>;
    private bannerRepo: Repository<Models.Banner>;
    private fontRepo: Repository<Models.Font>;
    private emojiRepo: Repository<Models.Emoji>;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
        private readonly blacketLogger: BlacketLoggerService
    ) {
        super({
            dialect: "postgres",
            username: configService.get<string>("SERVER_DATABASE_USER"),
            password: configService.get<string>("SERVER_DATABASE_PASSWORD"),
            database: configService.get<string>("SERVER_DATABASE_NAME"),
            host: configService.get<string>("SERVER_DATABASE_HOST"),
            port: configService.get<number>("SERVER_DATABASE_PORT"),
            repositoryMode: true,
            // remove all the other types we only want the actual models
            models: Object.values(Models).map((model) => typeof model === "function" ? model : null).filter((model) => model !== null),
            logging: configService.get<string>("NODE_ENV") === "production" ? false : (msg) => blacketLogger.debug(msg, "Database", "Sequelize")
        });
    }

    async onModuleInit() {
        this.sessionRepo = this.getRepository(Models.Session);
        this.resourceRepo = this.getRepository(Models.Resource);
        this.roomRepo = this.getRepository(Models.Room);
        this.blookRepo = this.getRepository(Models.Blook);
        this.rarityRepo = this.getRepository(Models.Rarity);
        this.packRepo = this.getRepository(Models.Pack);
        this.itemRepo = this.getRepository(Models.Item);
        this.titleRepo = this.getRepository(Models.Title);
        this.bannerRepo = this.getRepository(Models.Banner);
        this.fontRepo = this.getRepository(Models.Font);
        this.emojiRepo = this.getRepository(Models.Emoji);

        // development mode setting handler
        if (this.configService.get<string>("NODE_ENV") !== "production") {
            if (this.configService.get<string>("SERVER_DEV_RESEED_DATABASE") === "true") {
                await this.sync({ force: true });
                await this.seedDatabase();
            } else {
                await this.sync({ alter: true });
            }
        }

        // all next for loops are for redis caching so we don't have to fetch it again to save on performance
        await this.redisService.flushall();

        for (const session of await this.sessionRepo.findAll() as Models.Session[]) {
            this.redisService.set(`blacket-session:${session.userId}`, JSON.stringify(session));
        }

        for (const resource of await this.resourceRepo.findAll() as Models.Resource[]) {
            this.redisService.set(`blacket-resource:${resource.id}`, JSON.stringify(resource));
        }

        for (const room of await this.roomRepo.findAll() as Models.Room[]) {
            this.redisService.set(`blacket-room:${room.id}`, JSON.stringify(room));
        }

        for (const blook of await this.blookRepo.findAll() as Models.Blook[]) {
            this.redisService.set(`blacket-blook:${blook.id}`, JSON.stringify({ ...blook.dataValues }));
        }

        for (const rarity of await this.rarityRepo.findAll() as Models.Rarity[]) {
            this.redisService.set(`blacket-rarity:${rarity.id}`, JSON.stringify({ ...rarity.dataValues }));
        }

        for (const pack of await this.packRepo.findAll() as Models.Pack[]) {
            this.redisService.set(`blacket-pack:${pack.id}`, JSON.stringify({ ...pack.dataValues }));
        }

        for (const item of await this.itemRepo.findAll() as Models.Item[]) {
            this.redisService.set(`blacket-item:${item.id}`, JSON.stringify({ ...item.dataValues }));
        }

        for (const title of await this.titleRepo.findAll() as Models.Title[]) {
            this.redisService.set(`blacket-title:${title.id}`, JSON.stringify(title));
        }

        for (const banner of await this.bannerRepo.findAll() as Models.Banner[]) {
            this.redisService.set(`blacket-banner:${banner.id}`, JSON.stringify({ ...banner.dataValues }));
        }

        for (const font of await this.fontRepo.findAll() as Models.Font[]) {
            this.redisService.set(`blacket-font:${font.id}`, JSON.stringify({ ...font.dataValues }));
        }

        for (const emoji of await this.emojiRepo.findAll() as Models.Emoji[]) {
            this.redisService.set(`blacket-emoji:${emoji.id}`, JSON.stringify({ ...emoji.dataValues }));
        }
    }

    async seedDatabase() {
        // this will only run once after the database has been wiped to provide it with initial data

        const transaction = await this.transaction();

        await this.resourceRepo.create({ path: "https://cdn.blacket.org/static/content/blooks/Default.png" }, { transaction }); // resource id 1
        await this.resourceRepo.create({ path: "https://cdn.blacket.org/static/content/banners/Default.png" }, { transaction }); // resource id 2
        await this.resourceRepo.create({ path: "https://cdn.blacket.org/static/content/fonts/Nunito Bold.ttf" }, { transaction }); // resource id 3
        await this.resourceRepo.create({ path: "https://cdn.blacket.org/static/content/fonts/Titan One.ttf" }, { transaction }); // resource id 4

        await this.roomRepo.create({ id: 0, name: "global", public: true }, { transaction });

        await this.rarityRepo.create({ name: "Common", color: "#ffffff", experience: 0, animationType: RarityAnimationType.UNCOMMON }, { transaction });
        await this.rarityRepo.create({ name: "Uncommon", color: "#ffffff", experience: 5, animationType: RarityAnimationType.UNCOMMON }, { transaction });
        await this.rarityRepo.create({ name: "Rare", color: "#ffffff", experience: 10, animationType: RarityAnimationType.RARE }, { transaction });
        await this.rarityRepo.create({ name: "Epic", color: "#ffffff", experience: 25, animationType: RarityAnimationType.EPIC }, { transaction });
        await this.rarityRepo.create({ name: "Legendary", color: "#ffffff", experience: 100, animationType: RarityAnimationType.LEGENDARY }, { transaction });
        await this.rarityRepo.create({ name: "Chroma", color: "#ffffff", experience: 250, animationType: RarityAnimationType.CHROMA }, { transaction });
        await this.rarityRepo.create({ name: "Unique", color: "#ffffff", experience: 500, animationType: RarityAnimationType.CHROMA }, { transaction });
        await this.rarityRepo.create({ name: "Mystical", color: "#ffffff", experience: 500, animationType: RarityAnimationType.CHROMA }, { transaction });
        await this.rarityRepo.create({ name: "Iridescent", color: "#ffffff", experience: 1000, animationType: RarityAnimationType.IRIDESCENT }, { transaction });

        await this.bannerRepo.create({ name: "Default", imageId: 2 }, { transaction });

        await this.titleRepo.create({ name: "Common" }, { transaction });

        await this.blookRepo.create({ name: "Default", chance: 0, price: 0, rarityId: 1, imageId: 1, backgroundId: 1, priority: 0 }, { transaction });

        await this.fontRepo.create({ name: "Nunito Bold", resourceId: 3 }, { transaction });
        await this.fontRepo.create({ name: "Titan One", resourceId: 4 }, { transaction });

        await transaction.commit().catch(async (error) => this.blacketLogger.error(error, "Database", "Sequelize"));
    }
}
