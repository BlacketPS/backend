import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Blook, DataBoostersEntity, PersonalBoost } from "@blacket/types";
import { BoostType } from "@blacket/core";

export enum DataKey {
    BLOOK = "blook",
    RARITY = "rarity",
    PACK = "pack",
    ITEM = "item",
    ITEM_SHOP = "itemShop",
    TITLE = "title",
    BANNER = "banner",
    BADGE = "badge",
    FONT = "font",
    EMOJI = "emoji",
    RESOURCE = "resource",
    PRODUCT = "product",
    CREDIT = "credit",
    SPINNY_WHEEL = "spinnyWheel"
}

@Injectable()
export class DataService {
    constructor(
        private redisService: RedisService,
        private prismaService: PrismaService
    ) { }

    async getBlooksFromPack(packId: number): Promise<Blook[]> {
        const blooks = await this.redisService.getAllFromKey(DataKey.BLOOK);

        return blooks.filter((blook) => blook.packId === packId && (!blook.onlyOnDay || blook.onlyOnDay === new Date().getDay() + 1));
    }

    async getBoosters(userId: string): Promise<DataBoostersEntity> {
        const globalBoosters = await this.prismaService.boost.findMany({
            where: {
                solo: false,
                createdAt: { lte: new Date() },
                expiresAt: { gte: new Date() }
            },
            orderBy: {
                expiresAt: "asc"
            },
            include: {
                user: true
            }
        });

        const globalChanceBoosters = globalBoosters.filter((b) => b.type === BoostType.CHANCE);
        const globalShinyBoosters = globalBoosters.filter((b) => b.type === BoostType.SHINY);

        const personalBoosters = await this.prismaService.boost.findMany({
            where: {
                solo: true,
                userId,
                createdAt: { lte: new Date() },
                expiresAt: { gte: new Date() }
            },
            orderBy: {
                expiresAt: "asc"
            }
        });

        const personalChanceBoosters = personalBoosters.filter((b) => b.type === BoostType.CHANCE);
        const personalShinyBoosters = personalBoosters.filter((b) => b.type === BoostType.SHINY);

        const activeGlobalChanceBooster = globalChanceBoosters[0];
        const activeGlobalShinyBooster = globalShinyBoosters[0];

        const activePersonalChanceBooster: PersonalBoost = personalChanceBoosters
            .slice(0, 5)
            .reduce((acc, curr) => {
                if (!acc) return curr;
                return {
                    expiresAt: new Date(Math.max(acc.expiresAt.getTime(), curr.expiresAt.getTime())),
                    multiplier: parseFloat((1 + (acc.multiplier - 1) + (curr.multiplier - 1)).toFixed(3))
                };
            }, null);
        const activePersonalShinyBooster: PersonalBoost = personalShinyBoosters
            .slice(0, 5)
            .reduce((acc, curr) => {
                if (!acc) return curr;
                return {
                    expiresAt: new Date(Math.max(acc.expiresAt.getTime(), curr.expiresAt.getTime())),
                    multiplier: parseFloat((1 + (acc.multiplier - 1) + (curr.multiplier - 1)).toFixed(3))
                };
            }, null);

        return {
            global: {
                chance: activeGlobalChanceBooster ?? null,
                shiny: activeGlobalShinyBooster ?? null
            },
            personal: {
                chance: activePersonalChanceBooster ?? null,
                shiny: activePersonalShinyBooster ?? null
            }
        };
    }
}
