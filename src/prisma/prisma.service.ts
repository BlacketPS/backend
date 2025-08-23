import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BlacketLoggerService } from "src/core/logger/logger.service";

import { PrismaClient, RarityAnimationType, SpinnyWheelRewardType } from "@blacket/core";

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
            const swtResource = await tx.resource.create({ data: { path: "{cdn}/content/items/Daily Spinny Wheel Ticket.png", reference: "DAILY_SPINNY_WHEEL_TICKET" } });

            const commonIcon = await tx.resource.create({ data: { path: "{cdn}/content/common.png", reference: "COMMON_ICON" } });
            const uncommonIcon = await tx.resource.create({ data: { path: "{cdn}/content/uncommon.png", reference: "UNCOMMON_ICON" } });
            const rareIcon = await tx.resource.create({ data: { path: "{cdn}/content/rare.png", reference: "RARE_ICON" } });
            const epicIcon = await tx.resource.create({ data: { path: "{cdn}/content/epic.png", reference: "EPIC_ICON" } });
            const legendaryIcon = await tx.resource.create({ data: { path: "{cdn}/content/legendary.png", reference: "LEGENDARY_ICON" } });
            const chromaIcon = await tx.resource.create({ data: { path: "{cdn}/content/chroma.png", reference: "CHROMA_ICON" } });
            const supremeIcon = await tx.resource.create({ data: { path: "{cdn}/content/supreme.png", reference: "SUPREME_ICON" } });
            const mythicalIcon = await tx.resource.create({ data: { path: "{cdn}/content/mythical.png", reference: "MYTHICAL_ICON" } });
            const uniqueIcon = await tx.resource.create({ data: { path: "{cdn}/content/unique.png", reference: "UNIQUE_ICON" } });
            const iridescentIcon = await tx.resource.create({ data: { path: "{cdn}/content/iridescent.png", reference: "IRIDESCENT_ICON" } });

            await tx.room.createMany({
                data: [
                    { name: "global", public: true, id: 0 },
                    { name: "trading-plaza", public: true, id: 1 }
                ]
            });

            const commonRarity = await tx.rarity.create({ data: { name: "Common", color: "#ffffff", experience: 0, animationType: RarityAnimationType.COMMON, imageId: commonIcon.id } });

            await tx.rarity.create({ data: { name: "Uncommon", color: "#29e629", experience: 1, animationType: RarityAnimationType.COMMON, imageId: uncommonIcon.id } });
            await tx.rarity.create({ data: { name: "Rare", color: "#0000ff", experience: 5, animationType: RarityAnimationType.RARE, imageId: rareIcon.id } });
            await tx.rarity.create({ data: { name: "Epic", color: "#8000ff", experience: 25, animationType: RarityAnimationType.EPIC, imageId: epicIcon.id } });
            await tx.rarity.create({ data: { name: "Legendary", color: "#ffaf0f", experience: 100, animationType: RarityAnimationType.LEGENDARY, imageId: legendaryIcon.id } });
            await tx.rarity.create({ data: { name: "Chroma", color: "#00ccff", experience: 250, animationType: RarityAnimationType.CHROMA, imageId: chromaIcon.id } });
            await tx.rarity.create({ data: { name: "Supreme", color: "#be0000", experience: 250, animationType: RarityAnimationType.CHROMA, imageId: supremeIcon.id } });
            await tx.rarity.create({ data: { name: "Mythical", color: "#ff75ff", experience: 1000, animationType: RarityAnimationType.MYTHICAL, imageId: mythicalIcon.id } });
            await tx.rarity.create({ data: { name: "Unique", color: "#008080", experience: 1000, animationType: RarityAnimationType.MYTHICAL, imageId: uniqueIcon.id } });
            await tx.rarity.create({ data: { name: "Iridescent", color: "rainbow", experience: 1000, animationType: RarityAnimationType.MYTHICAL, imageId: iridescentIcon.id } });

            await tx.banner.create({ data: { name: "Default", resource: { connect: { id: defaultBanner.id } } } });

            await tx.blook.create({ data: { name: "Default", chance: 0, price: 0, rarity: { connect: { id: commonRarity.id } }, priority: 0, background: { connect: { id: defaultBlookBackground.id } }, image: { connect: { id: defaultBlook.id } } } });

            const defaultFont = await tx.font.create({ data: { name: "Nunito Bold", resourceId: defaultFont1.id, default: true, priority: 1 } });

            await tx.font.createMany({
                data: [
                    { name: "Titan One", resourceId: defaultFont2.id, default: true, priority: 2 }
                ]
            });

            await tx.title.create({ data: { name: "Common", fontId: defaultFont.id } });

            const swtItem = await tx.item.create({
                data: {
                    name: "Spinny Wheel Ticket",
                    description: "Spin the daily wheel for a chance to win great prizes!",
                    rarityId: commonRarity.id,
                    imageId: swtResource.id,
                    priority: 0
                }
            });

            const sw = await tx.spinnyWheel.create({
                data: {
                    name: "Daily Spinny Wheel",
                    itemId: swtItem.id
                }
            });

            await tx.spinnyWheelReward.createMany({
                data: [
                    { type: SpinnyWheelRewardType.TOKENS, tokens: 500, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.TOKENS, tokens: 600, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.TOKENS, tokens: 700, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.TOKENS, tokens: 800, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.TOKENS, tokens: 900, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.TOKENS, tokens: 1000, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.ITEM, itemId: swtItem.id, spinnyWheelId: sw.id, chance: 20 },
                    { type: SpinnyWheelRewardType.CRYSTALS, crystals: 5, spinnyWheelId: sw.id, chance: 5 }
                ]
            });

            this.blacketLogger.info("Database has been seeded with initial data!", "Database", "Blacket");
        });
    }
}
