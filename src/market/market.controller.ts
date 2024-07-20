import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from "@nestjs/common";
import { MarketService } from "./market.service";
import { GetCurrentUser } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { MarketOpenPackEntity, MarketOpenPackDto } from "blacket-types";

@ApiTags("market")
@Controller("market")
export class MarketController {
    constructor(private readonly marketService: MarketService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("open-pack")
    async openPack(@GetCurrentUser() userId: string, @Body() dto: MarketOpenPackDto) {
        const blookId: number = await this.marketService.openPack(userId, dto);

        return new MarketOpenPackEntity({ id: blookId });
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("gimme-item")
    gimmeItem(@GetCurrentUser() userId: string) {
        return this.marketService.gimmeItem(userId);
    }
}
