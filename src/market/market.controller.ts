import { Body, Controller, Post } from "@nestjs/common";
import { MarketService } from "./market.service";
import { GetCurrentUser } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { MarketOpenPackEntity, MarketOpenPackDto } from "@blacket/types";
import { seconds, Throttle } from "@nestjs/throttler";

@ApiTags("market")
@Controller("market")
export class MarketController {
    constructor(private readonly marketService: MarketService) { }

    @Throttle({ default: { limit: 30, ttl: seconds(20) } })
    @Post("open-pack")
    async openPack(@GetCurrentUser() userId: string, @Body() dto: MarketOpenPackDto) {
        const blookId: number = await this.marketService.openPack(userId, dto);

        return new MarketOpenPackEntity({ id: blookId });
    }
}
