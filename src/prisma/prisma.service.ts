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
        // await this.seedDatabase();

        // development mode setting handler
        if (this.configService.get<string>("NODE_ENV") !== "production") {
            if (this.configService.get<string>("SERVER_DEV_RESEED_DATABASE") === "true") {
                this.blacketLogger.info("Creating database...", "Database", "Blacket");


                this.blacketLogger.info("Database has been created! Please set \"SERVER_DEV_RESEED_DATABASE\" to false in your .env to prevent this from happening again.", "Database", "Blacket");
                process.exit(0);
            }
        }
    }

    // this will only run once after the database has been wiped to provide it with initial data
    async seedDatabase() {
        this.blacketLogger.info("Seeding database with initial data...", "Database", "Blacket");

        // truncate entire database
        await this.$transaction(async (tx) => {
            const defaultBlook = await tx.resource.create({ data: { path: "{cdn}/content/blooks/Default.png", reference: "DEFAULT_BLOOK" } });
            const defaultBlookBackground = await tx.resource.create({ data: { path: "{cdn}/content/blooks/backgrounds/Default.png", reference: "DEFAULT_BLOOK_BACKGROUND" } });
            const defaultBanner = await tx.resource.create({ data: { path: "{cdn}/content/banners/Default.png", reference: "DEFAULT_BANNER" } });
            const defaultFont1 = await tx.resource.create({ data: { path: "{cdn}/content/fonts/Nunito Bold.ttf", reference: "DEFAULT_FONT_1" } });
            const defaultFont2 = await tx.resource.create({ data: { path: "{cdn}/content/fonts/Titan One.ttf", reference: "DEFAULT_FONT_2" } });
            const spinnyWheelTicket = await tx.resource.create({ data: { path: "{cdn}/content/items/Daily Spinny Wheel Ticket.png", reference: "DAILY_SPINNY_WHEEL_TICKET" } });

            await tx.room.createMany({
                data: [
                    { name: "global", public: true, id: 0 },
                    { name: "trading-plaza", public: true, id: 1 }
                ]
            });

            await tx.rarity.createMany({
                data: [
                    { name: "Common", color: "#ffffff", experience: 0, animationType: RarityAnimationType.UNCOMMON },
                    { name: "Uncommon", color: "#29e629", experience: 1, animationType: RarityAnimationType.UNCOMMON },
                    { name: "Rare", color: "#0000ff", experience: 5, animationType: RarityAnimationType.RARE },
                    { name: "Epic", color: "#8000ff", experience: 25, animationType: RarityAnimationType.EPIC },
                    { name: "Legendary", color: "#ffaf0f", experience: 100, animationType: RarityAnimationType.LEGENDARY },
                    { name: "Chroma", color: "#00ccff", experience: 250, animationType: RarityAnimationType.CHROMA },
                    { name: "Supreme", color: "#be0000", experience: 250, animationType: RarityAnimationType.CHROMA },
                    { name: "Mythical", color: "#ff75ff", experience: 1000, animationType: RarityAnimationType.CHROMA },
                    { name: "Unique", color: "#008080", experience: 1000, animationType: RarityAnimationType.CHROMA },
                    { name: "Iridescent", color: "rainbow", experience: 1000, animationType: RarityAnimationType.IRIDESCENT }
                ]
            });

            await tx.banner.create({ data: { name: "Default", resource: { connect: { id: defaultBanner.id } } } });

            await tx.title.create({ data: { name: "Common" } });

            await tx.blook.create({ data: { name: "Default", chance: 0, price: 0, rarity: { connect: { id: 1 } }, priority: 0, background: { connect: { id: defaultBlookBackground.id } }, image: { connect: { id: defaultBlook.id } } } });
            await tx.font.createMany({
                data: [
                    { name: "Nunito Bold", resourceId: defaultFont1.id, default: true, priority: 1 },
                    { name: "Titan One", resourceId: defaultFont2.id, default: true, priority: 2 }
                ]
            });

            await tx.item.createMany({
                data: [
                    {
                        name: "Spinny Wheel Ticket",
                        description: "Spin the daily wheel for a chance to win great prizes!",
                        rarityId: 1,
                        imageId: spinnyWheelTicket.id,
                        priority: 0
                    }
                ]
            });
        });

        this.blacketLogger.info("Database has been seeded with initial data!", "Database", "Blacket");
    }
}
