import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/redis/redis.service";
import { Repository, Sequelize } from "sequelize-typescript";
import { BlacketLoggerService } from "src/core/logger/logger.service";
import * as Models from "src/models";

import { AnimationType } from "src/models/rarity.model";

@Injectable()
export class SequelizeService extends Sequelize {
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
            models: Object.values(Models),
            repositoryMode: true,
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

        if (this.configService.get<string>("NODE_ENV") !== "production") {
            await this.sync({ force: true });

            await this.seedDatabase();
        }

        await this.redisService.del("blacket-session:*");

        for (const session of await this.sessionRepo.findAll()) {
            await this.redisService.set(`blacket-session:${session.userId}`, JSON.stringify(session));
        }

        for (const blook of await this.blookRepo.findAll({
            include: [
                { model: this.resourceRepo, as: "image" },
                { model: this.resourceRepo, as: "background" }
            ],
            attributes: {
                exclude: [
                    "imageId",
                    "backgroundId"
                ]
            }
        }) as Models.Blook[]) {
            await this.redisService.set(`blacket-blook:${blook.id}`, JSON.stringify({ ...blook.dataValues, image: blook.imagePath, background: blook.backgroundPath }));
        }

        for (const rarity of await this.rarityRepo.findAll()) {
            await this.redisService.set(`blacket-rarity:${rarity.id}`, JSON.stringify({ ...rarity.dataValues }));
        }

        for (const pack of await this.packRepo.findAll({ include: [{ model: this.resourceRepo, as: "image" }], attributes: { exclude: ["imageId"] } }) as Models.Pack[]) {
            await this.redisService.set(`blacket-pack:${pack.id}`, JSON.stringify({ ...pack.dataValues, image: pack.imagePath }));
        }

        for (const item of await this.itemRepo.findAll({ include: [{ model: this.resourceRepo, as: "image" }], attributes: { exclude: ["imageId"] } }) as Models.Item[]) {
            await this.redisService.set(`blacket-item:${item.id}`, JSON.stringify({ ...item.dataValues, image: item.imagePath }));
        }

        for (const title of await this.titleRepo.findAll()) {
            await this.redisService.set(`blacket-title:${title.id}`, JSON.stringify(title));
        }

        for (const banner of await this.bannerRepo.findAll({ include: [{ model: this.resourceRepo, as: "image" }], attributes: { exclude: ["imageId"] } }) as Models.Banner[]) {
            await this.redisService.set(`blacket-banner:${banner.id}`, JSON.stringify({ ...banner.dataValues, image: banner.imagePath }));
        }

        for (const emoji of await this.emojiRepo.findAll({ include: [{ model: this.resourceRepo, as: "image" }], attributes: { exclude: ["imageId"] } }) as Models.Emoji[]) {
            await this.redisService.set(`blacket-emoji:${emoji.id}`, JSON.stringify({ ...emoji.dataValues, image: emoji.imagePath }));
        }
    }

    async seedDatabase() {
        // add database seeding code here, this is only run when after the database has been wiped to provide it with initial data

        const transaction = await this.transaction();

        await this.resourceRepo.create({ path: "/content/blooks/Default.png" }, { transaction });
        await this.resourceRepo.create({ path: "/content/banners/Default.png" }, { transaction });
        await this.resourceRepo.create({ path: "/content/fonts/Nunito.ttf" }, { transaction });
        await this.resourceRepo.create({ path: "/content/fonts/Titan One.ttf" }, { transaction });

        await this.rarityRepo.create({ name: "Common", color: "#ffffff", experience: 0, animationType: AnimationType.UNCOMMON }, { transaction });

        await this.bannerRepo.create({ name: "Default", imageId: 2 }, { transaction });
        await this.titleRepo.create({ name: "Common" }, { transaction });

        await this.fontRepo.create({ name: "Nunito", resourceId: 3 }, { transaction });
        await this.fontRepo.create({ name: "Titan One", resourceId: 4 }, { transaction });

        await transaction.commit().catch(async (error) => this.blacketLogger.error(error, "Database", "Sequelize"));
    }
}
