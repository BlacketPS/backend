import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Blook } from "@blacket/types";

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
    CREDIT = "credit"
}

@Injectable()
export class DataService {
    constructor(
        private redisService: RedisService
    ) { }

    async getBlooksFromPack(packId: number): Promise<Blook[]> {
        const blooks = await this.redisService.getAllFromKey(DataKey.BLOOK);

        return blooks.filter((blook) => blook.packId === packId && (!blook.onlyOnDay || blook.onlyOnDay === new Date().getDay() + 1));
    }
}
