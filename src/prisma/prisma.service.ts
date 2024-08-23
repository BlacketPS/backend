import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BlacketLoggerService } from "src/core/logger/logger.service";

import { PrismaClient, RarityAnimationType } from "@blacket/core";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor(
        private readonly configService: ConfigService,
        private readonly blacketLogger: BlacketLoggerService
    ) {
        super({
            datasources: {
                db: {
                    url: `postgresql://${configService.get("SERVER_DATABASE_USER")}:${configService.get("SERVER_DATABASE_PASSWORD")}@${configService.get("SERVER_DATABASE_HOST")}:${configService.get("SERVER_DATABASE_PORT")??5432}/${configService.get("SERVER_DATABASE_NAME")}?schema=public`
                }
            },
            omit: {
                userSetting: { id: true },
                userStatistic: { id: true },
                userPaymentMethod: {
                    squareCustomerId: true,
                    squarePaymentMethodId: true
                }
            }
        });
    }

    async onModuleInit() {
        // development mode setting handler
        if (this.configService.get<string>("NODE_ENV") !== "production") {
            if (this.configService.get<string>("SERVER_DEV_RESEED_DATABASE") === "true") {
                this.blacketLogger.info("Creating database...", "Database", "Blacket");

                await this.seedDatabase();

                this.blacketLogger.info("Database has been created! Please set \"SERVER_DEV_RESEED_DATABASE\" to false in your .env to prevent this from happening again.", "Database", "Blacket");
                process.exit(0);
            }
        }
    }

    // this will only run once after the database has been wiped to provide it with initial data
    async seedDatabase() {
        this.blacketLogger.info("Seeding database with initial data...", "Database", "Blacket");

        // truncate entire database
        await this.$transaction([
            this.resource.deleteMany({}),
            this.room.deleteMany({}),
            this.rarity.deleteMany({}),
            this.banner.deleteMany({}),
            this.title.deleteMany({}),
            this.blook.deleteMany({}),
            this.font.deleteMany({}),
            this.user.deleteMany({}),

            this.resource.create({ data: { path: this.configService.get<string>("VITE_CDN_URL") + "/content/blooks/Default.png" } }), // resource id 1
            this.resource.create({ data: { path: this.configService.get<string>("VITE_CDN_URL") + "/content/blooks/backgrounds/Default.png" } }), // resource id 2
            this.resource.create({ data: { path: this.configService.get<string>("VITE_CDN_URL") + "/content/banners/Default.png" } }), // resource id 3
            this.resource.create({ data: { path: this.configService.get<string>("VITE_CDN_URL") + "/content/fonts/Nunito Bold.ttf" } }), // resource id 4
            this.resource.create({ data: { path: this.configService.get<string>("VITE_CDN_URL") + "/content/fonts/Titan One.ttf" } }), // resource id 5

            // @autoincrement likes to start at 1 for some reason
            this.room.create({ data: { name: "global", public: true, id: 0 } }),

            this.rarity.create({ data: { name: "Common", color: "#ffffff", experience: 0, animationType: RarityAnimationType.UNCOMMON } }),
            this.rarity.create({ data: { name: "Uncommon", color: "#ffffff", experience: 1, animationType: RarityAnimationType.UNCOMMON } }),
            this.rarity.create({ data: { name: "Rare", color: "#ffffff", experience: 5, animationType: RarityAnimationType.RARE } }),
            this.rarity.create({ data: { name: "Epic", color: "#ffffff", experience: 25, animationType: RarityAnimationType.EPIC } }),
            this.rarity.create({ data: { name: "Legendary", color: "#ffffff", experience: 100, animationType: RarityAnimationType.LEGENDARY } }),
            this.rarity.create({ data: { name: "Chroma", color: "#ffffff", experience: 250, animationType: RarityAnimationType.CHROMA } }),
            this.rarity.create({ data: { name: "Mystical", color: "#ffffff", experience: 1000, animationType: RarityAnimationType.CHROMA } }),
            this.rarity.create({ data: { name: "Unique", color: "#ffffff", experience: 1000, animationType: RarityAnimationType.CHROMA } }),
            this.rarity.create({ data: { name: "Iridescent", color: "#ffffff", experience: 1000, animationType: RarityAnimationType.IRIDESCENT } }),

            this.banner.create({ data: { name: "Default", resource: { connect: { id: 3 } } } }),

            this.title.create({ data: { name: "Common" } }),

            this.blook.create({ data: { name: "Default", chance: 0, price: 0, rarity: { connect: { id: 1 } }, priority: 0, background: { connect: { id: 2 } }, image: { connect: { id: 1 } } } }),

            this.font.create({ data: { name: "Nunito Bold", resource: { connect: { id: 4 } } } }),
            this.font.create({ data: { name: "Titan One", resource: { connect: { id: 5 } } } })
        ]);

        this.blacketLogger.info("Database has been seeded with initial data!", "Database", "Blacket");
    }
}
