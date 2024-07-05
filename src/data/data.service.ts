import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { safelyParseJSON } from "src/core/functions";
import { Pack, Blook } from "blacket-types";

export enum DataKey {
    BLOOK = "blacket-blook:",
    RARITY = "blacket-rarity:",
    PACK = "blacket-pack:",
    ITEM = "blacket-item:",
    TITLE = "blacket-title:",
    BANNER = "blacket-banner:",
    BADGE = "blacket-badge:",
    FONT = "blacket-font:",
    EMOJI = "blacket-emoji:",
    RESOURCE = "blacket-resource:"
}

@Injectable()
export class DataService {
    constructor(
        private redisService: RedisService
    ) { }

    async getAllFromDataKey(key: DataKey) {
        const keys = await this.redisService.keys(key + "*");

        const data = keys.length ? await this.redisService.mget(keys) : [];

        return data.map((item: string) => safelyParseJSON(item));
    }

    async getBlook(blookId: number): Promise<Blook> {
        const data = await this.redisService.get(DataKey.BLOOK + blookId);

        return safelyParseJSON(data);
    }

    async getRarity(rarityId: number) {
        const data = await this.redisService.get(DataKey.RARITY + rarityId);

        return safelyParseJSON(data);
    }

    async getItem(itemId: number) {
        const data = await this.redisService.get(DataKey.ITEM + itemId);

        return safelyParseJSON(data);
    }

    async getTitle(titleId: number) {
        const data = await this.redisService.get(DataKey.TITLE + titleId);

        return safelyParseJSON(data);
    }

    async getBanner(bannerId: number) {
        const data = await this.redisService.get(DataKey.BANNER + bannerId);

        return safelyParseJSON(data);
    }

    async getBadge(badgeId: number) {
        const data = await this.redisService.get(DataKey.BADGE + badgeId);

        return safelyParseJSON(data);
    }

    async getFont(fontId: number) {
        const data = await this.redisService.get(DataKey.FONT + fontId);

        return safelyParseJSON(data);
    }

    async getEmoji(emojiId: number) {
        const data = await this.redisService.get(DataKey.EMOJI + emojiId);

        return safelyParseJSON(data);
    }

    async getResource(resourceId: number) {
        const data = await this.redisService.get(DataKey.RESOURCE + resourceId);

        return safelyParseJSON (data);
    }

    async getPack(packId: number): Promise<Pack> {
        const data = await this.redisService.get(DataKey.PACK + packId);

        return safelyParseJSON(data);
    }

    async getBlooksFromPack(packId: number): Promise<Blook[]> {
        const blooks = await this.getAllFromDataKey(DataKey.BLOOK);

        return blooks.filter((blook) => blook.packId === packId && (!blook.onlyOnDay || blook.onlyOnDay === new Date().getDay() + 1));
    }
}
