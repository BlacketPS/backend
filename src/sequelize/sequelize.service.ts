import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Repository, Sequelize } from "sequelize-typescript";
import { BlacketLoggerService } from "src/core/logger/logger.service";
import * as Models from "blacket-types/dist/models";

import { RarityAnimationType, PermissionType } from "blacket-types";

@Injectable()
export class SequelizeService extends Sequelize implements OnModuleInit {
    private permissionRepo: Repository<Models.Permission>;
    private resourceRepo: Repository<Models.Resource>;
    private roomRepo: Repository<Models.Room>;
    private blookRepo: Repository<Models.Blook>;
    private rarityRepo: Repository<Models.Rarity>;
    private titleRepo: Repository<Models.Title>;
    private bannerRepo: Repository<Models.Banner>;
    private fontRepo: Repository<Models.Font>;

    constructor(
        private readonly configService: ConfigService,
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
            pool: { max: 100, min: 1, acquire: 30000, idle: 10000 },
            models: Object.values(Models).map((model) => typeof model === "function" ? model : null).filter((model) => model !== null),
            logging: configService.get<string>("NODE_ENV") === "production" ? false : (msg) => blacketLogger.debug(msg, "Database", "Sequelize")
        });
    }

    async onModuleInit() {
        this.permissionRepo = this.getRepository(Models.Permission);
        this.resourceRepo = this.getRepository(Models.Resource);
        this.roomRepo = this.getRepository(Models.Room);
        this.blookRepo = this.getRepository(Models.Blook);
        this.rarityRepo = this.getRepository(Models.Rarity);
        this.titleRepo = this.getRepository(Models.Title);
        this.bannerRepo = this.getRepository(Models.Banner);
        this.fontRepo = this.getRepository(Models.Font);

        // development mode setting handler
        if (this.configService.get<string>("NODE_ENV") !== "production") {
            if (this.configService.get<string>("SERVER_DEV_RESEED_DATABASE") === "true") {
                this.blacketLogger.info("Creating database...", "Database", "Blacket");

                await this.sync({ force: true });
                await this.seedDatabase();

                this.blacketLogger.info("Database has been created! Please set \"SERVER_DEV_RESEED_DATABASE\" to false in your .env to prevent this from happening again.", "Database", "Blacket");
                process.exit(0);
            } else {
                this.blacketLogger.info("Syncing database...", "Database", "Blacket");

                await this.sync({ alter: true });

                this.blacketLogger.info("Database synced!", "Database", "Blacket");
            }
        }

        // we run this everytime the server starts just incase there are new permissions
        this.blacketLogger.info("Checking for new permissions...", "Database", "Blacket");

        for (const permission of Object.values(PermissionType).filter((permission) => isNaN(Number(permission)))) {
            if (await this.permissionRepo.findByPk(PermissionType[permission])) {
                this.blacketLogger.info(`Permission ${permission} already exists, skipping...`, "Database", "Blacket");

                continue;
            }

            const permissionName = permission as string;

            this.blacketLogger.info(`NEW PERMISSION FOUND! Creating new permission ${permissionName} with ID ${PermissionType[permission]}...`, "Database", "Blacket");
            await this.permissionRepo.create({ id: PermissionType[permission], name: permissionName });
            this.blacketLogger.info(`Permission ${permissionName} has been created!`, "Database", "Blacket");
        }
    }

    // this will only run once after the database has been wiped to provide it with initial data
    async seedDatabase() {
        this.blacketLogger.info("Seeding database with initial data...", "Database", "Blacket");

        const transaction = await this.transaction();

        await this.resourceRepo.create({ path: this.configService.get<string>("VITE_CDN_URL") + "/content/blooks/Default.png" }, { transaction }); // resource id 1
        await this.resourceRepo.create({ path: this.configService.get<string>("VITE_CDN_URL") + "/content/blooks/backgrounds/Default.png" }, { transaction }); // resource id 2
        await this.resourceRepo.create({ path: this.configService.get<string>("VITE_CDN_URL") + "/content/banners/Default.png" }, { transaction }); // resource id 3
        await this.resourceRepo.create({ path: this.configService.get<string>("VITE_CDN_URL") + "/content/fonts/Nunito Bold.ttf" }, { transaction }); // resource id 4
        await this.resourceRepo.create({ path: this.configService.get<string>("VITE_CDN_URL") + "/content/fonts/Titan One.ttf" }, { transaction }); // resource id 5

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

        await this.bannerRepo.create({ name: "Default", imageId: 3 }, { transaction });

        await this.titleRepo.create({ name: "Common" }, { transaction });

        await this.blookRepo.create({ name: "Default", chance: 0, price: 0, rarityId: 1, imageId: 1, backgroundId: 2, priority: 0 }, { transaction });

        await this.fontRepo.create({ name: "Nunito Bold", resourceId: 4 }, { transaction });
        await this.fontRepo.create({ name: "Titan One", resourceId: 5 }, { transaction });

        await transaction.commit().catch(async (error) => this.blacketLogger.error(error, "Database", "Sequelize"));

        this.blacketLogger.info("Database has been seeded with initial data!", "Database", "Blacket");
    }
}
