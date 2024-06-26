import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { safelyParseJSON } from "src/core/functions";

export enum DataKey {
    BLOOK = "blacket-blook:*",
    RARITY = "blacket-rarity:*",
    PACK = "blacket-pack:*",
    ITEM = "blacket-item:*",
    TITLE = "blacket-title:*",
    BANNER = "blacket-banner:*",
    BADGE = "blacket-badge:*",
    FONT = "blacket-font:*",
    EMOJI = "blacket-emoji:*",
    RESOURCE = "blacket-resource:*"
}

@Injectable()
export class DataService {
    constructor(
        private redisService: RedisService
    ) { }

    async getData(key: DataKey) {
        const keys = await this.redisService.keys(key);

        const data = keys.length ? await this.redisService.mget(keys) : [];

        return data.map((item: string) => safelyParseJSON(item));
    }
}
