import { Controller, Get } from "@nestjs/common";
import { DataKey } from "./data.service";
import { RedisService } from "src/redis/redis.service";
import { Public } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { Throttle, seconds } from "@nestjs/throttler";

@ApiTags("data")
@Throttle({ default: { limit: 100, ttl: seconds(60) } })
@Controller("data")
export class DataController {
    constructor(
        private redisService: RedisService
    ) { }

    @Public()
    @Get("blooks")
    getBlooks() {
        return this.redisService.getAllFromKey(DataKey.BLOOK);
    }

    @Public()
    @Get("rarities")
    getRarities() {
        return this.redisService.getAllFromKey(DataKey.RARITY);
    }

    @Public()
    @Get("packs")
    getPacks() {
        return this.redisService.getAllFromKey(DataKey.PACK);
    }

    @Public()
    @Get("items")
    getItems() {
        return this.redisService.getAllFromKey(DataKey.ITEM);
    }

    @Public()
    @Get("item-shop")
    getItemShop() {
        return this.redisService.getAllFromKey(DataKey.ITEM_SHOP);
    }

    @Public()
    @Get("titles")
    getTitles() {
        return this.redisService.getAllFromKey(DataKey.TITLE);
    }

    @Public()
    @Get("banners")
    getBanners() {
        return this.redisService.getAllFromKey(DataKey.BANNER);
    }

    @Public()
    @Get("badges")
    getBadges() {
        return this.redisService.getAllFromKey(DataKey.BADGE);
    }

    @Public()
    @Get("fonts")
    getFonts() {
        return this.redisService.getAllFromKey(DataKey.FONT);
    }

    @Public()
    @Get("emojis")
    getEmojis() {
        return this.redisService.getAllFromKey(DataKey.EMOJI);
    }

    @Public()
    @Get("resources")
    getResources() {
        return this.redisService.getAllFromKey(DataKey.RESOURCE);
    }
}
