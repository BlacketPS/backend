import { Controller, Get } from "@nestjs/common";
import { DataService, DataKey } from "./data.service";
import { Public } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { Throttle, seconds } from "@nestjs/throttler";

@ApiTags("data")
@Throttle({ default: { limit: 100, ttl: seconds(60) } })
@Controller("data")
export class DataController {
    constructor(
        private readonly dataService: DataService
    ) { }

    @Public()
    @Get("blooks")
    getBlooks() {
        return this.dataService.getAllFromDataKey(DataKey.BLOOK);
    }

    @Public()
    @Get("rarities")
    getRarities() {
        return this.dataService.getAllFromDataKey(DataKey.RARITY);
    }

    @Public()
    @Get("packs")
    getPacks() {
        return this.dataService.getAllFromDataKey(DataKey.PACK);
    }

    @Public()
    @Get("items")
    getItems() {
        return this.dataService.getAllFromDataKey(DataKey.ITEM);
    }

    @Public()
    @Get("titles")
    getTitles() {
        return this.dataService.getAllFromDataKey(DataKey.TITLE);
    }

    @Public()
    @Get("banners")
    getBanners() {
        return this.dataService.getAllFromDataKey(DataKey.BANNER);
    }

    @Public()
    @Get("badges")
    getBadges() {
        return this.dataService.getAllFromDataKey(DataKey.BADGE);
    }

    @Public()
    @Get("fonts")
    getFonts() {
        return this.dataService.getAllFromDataKey(DataKey.FONT);
    }

    @Public()
    @Get("emojis")
    getEmojis() {
        return this.dataService.getAllFromDataKey(DataKey.EMOJI);
    }

    @Public()
    @Get("resources")
    getResources() {
        return this.dataService.getAllFromDataKey(DataKey.RESOURCE);
    }
}
