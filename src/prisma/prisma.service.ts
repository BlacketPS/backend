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
                    url: `postgresql://${configService.get("SERVER_DATABASE_USER")}:${configService.get("SERVER_DATABASE_PASSWORD")}@${configService.get("SERVER_DATABASE_HOST")}:${configService.get("SERVER_DATABASE_PORT") ?? 5432}/${configService.get("SERVER_DATABASE_NAME")}?schema=public`
                }
            },
            omit: {
                userSetting: { id: true },
                userStatistic: { id: true }
            }
        });
    }

    async onModuleInit() {
        // development mode setting handler
        if (this.configService.get<string>("NODE_ENV") !== "production") {
            if (this.configService.get<string>("SERVER_DEV_RESEED_DATABASE") === "true") {
                this.blacketLogger.info("Creating database...", "Database", "Blacket");

                // await this.seedDatabase();

                this.blacketLogger.info("Database has been created! Please set \"SERVER_DEV_RESEED_DATABASE\" to false in your .env to prevent this from happening again.", "Database", "Blacket");
                process.exit(0);
            }
        }
    }

    // this will only run once after the database has been wiped to provide it with initial data
    // async seedDatabase() {
    //     this.blacketLogger.info("Seeding database with initial data...", "Database", "Blacket");

    //     // truncate entire database
    //     await this.$transaction(async (prisma) => {
    //         await prisma.resource.deleteMany({});
    //         await prisma.room.deleteMany({});
    //         await prisma.rarity.deleteMany({});
    //         await prisma.banner.deleteMany({});
    //         await prisma.title.deleteMany({});
    //         await prisma.blook.deleteMany({});
    //         await prisma.font.deleteMany({});
    //         await prisma.user.deleteMany({});

    //         const defaultBlook = await prisma.resource.create({ data: { path: "{cdn}/content/blooks/Default.png", reference: "DEFAULT_BLOOK" } });
    //         const defaultBlookBackground = await prisma.resource.create({ data: { path: "{cdn}/content/blooks/backgrounds/Default.png", reference: "DEFAULT_BLOOK_BACKGROUND" } });
    //         const defaultBanner = await prisma.resource.create({ data: { path: "{cdn}/content/banners/Default.png", reference: "DEFAULT_BANNER" } });
    //         const defaultFont1 = await prisma.resource.create({ data: { path: "{cdn}/content/fonts/Nunito Bold.ttf", reference: "DEFAULT_FONT_1" } });
    //         const defaultFont2 = await prisma.resource.create({ data: { path: "{cdn}/content/fonts/Titan One.ttf", reference: "DEFAULT_FONT_2" } });

    //         await prisma.room.create({ data: { name: "global", public: true, id: 0 } });

    //         await prisma.rarity.create({ data: { name: "Common", color: "#ffffff", experience: 0, animationType: RarityAnimationType.UNCOMMON } });
    //         await prisma.rarity.create({ data: { name: "Uncommon", color: "#4bc22e", experience: 1, animationType: RarityAnimationType.UNCOMMON } });
    //         await prisma.rarity.create({ data: { name: "Rare", color: "#0a14fa", experience: 5, animationType: RarityAnimationType.RARE } });
    //         await prisma.rarity.create({ data: { name: "Epic", color: "#be0000", experience: 25, animationType: RarityAnimationType.EPIC } });
    //         await prisma.rarity.create({ data: { name: "Legendary", color: "#ff910f", experience: 100, animationType: RarityAnimationType.LEGENDARY } });
    //         await prisma.rarity.create({ data: { name: "Chroma", color: "#00ccff", experience: 250, animationType: RarityAnimationType.CHROMA } });
    //         await prisma.rarity.create({ data: { name: "Mystical", color: "#a335ee", experience: 1000, animationType: RarityAnimationType.CHROMA } });
    //         await prisma.rarity.create({ data: { name: "Unique", color: "#008080", experience: 1000, animationType: RarityAnimationType.CHROMA } });
    //         await prisma.rarity.create({ data: { name: "Iridescent", color: "rainbow", experience: 1000, animationType: RarityAnimationType.IRIDESCENT } });

    //         await prisma.banner.create({ data: { name: "Default", resource: { connect: { id: defaultBanner.id } } } });

    //         await prisma.title.create({ data: { name: "Common" } });

    //         await prisma.blook.create({ data: { name: "Default", chance: 0, price: 0, rarity: { connect: { id: 1 } }, priority: 0, background: { connect: { id: defaultBlookBackground.id } }, image: { connect: { id: defaultBlook.id } } } });

    //         await prisma.font.create({ data: { name: "Nunito Bold", resource: { connect: { id: defaultFont1.id } }, default: true, priority: 1 } });
    //         await prisma.font.create({ data: { name: "Titan One", resource: { connect: { id: defaultFont2.id } }, default: true, priority: 2 } });
    //     });

    //     this.blacketLogger.info("Database has been seeded with initial data!", "Database", "Blacket");
    // }
}
