import { Controller, Get } from "@nestjs/common";
import { DataService, DataKey } from "./data.service";
import { Public } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("data")
@Controller("data")
export class DataController {
    constructor(
        private readonly dataService: DataService
    ) { }

    @Public()
    @Get("blooks")
    getBlooks() {
        return this.dataService.getData(DataKey.BLOOK);
    }

    @Public()
    @Get("rarities")
    getRarities() {
        return this.dataService.getData(DataKey.RARITY);
    }

    @Public()
    @Get("packs")
    getPacks() {
        return this.dataService.getData(DataKey.PACK);
    }

    @Public()
    @Get("items")
    getItems() {
        return this.dataService.getData(DataKey.ITEM);
    }

    @Public()
    @Get("titles")
    getTitles() {
        return this.dataService.getData(DataKey.TITLE);
    }

    @Public()
    @Get("banners")
    getBanners() {
        return this.dataService.getData(DataKey.BANNER);
    }

    @Public()
    @Get("badges")
    getBadges() {
        return this.dataService.getData(DataKey.BADGE);
    }

    @Public()
    @Get("fonts")
    getFonts() {
        return this.dataService.getData(DataKey.FONT);
    }

    @Public()
    @Get("emojis")
    getEmojis() {
        return this.dataService.getData(DataKey.EMOJI);
    }
}
