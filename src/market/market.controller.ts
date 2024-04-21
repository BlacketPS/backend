import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from "@nestjs/common";
import { MarketService } from "./market.service";
import { GetCurrentUserId } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { OpenPackBlookEntity, OpenPackDto } from "blacket-types";

@ApiTags("market")
@Controller("market")
export class MarketController {
    constructor(private readonly marketService: MarketService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("open-pack")
    async openPack(@GetCurrentUserId() userId: string, @Body() packDto: OpenPackDto) {
        const blookId: number = await this.marketService.openPack(userId, packDto);
        return new OpenPackBlookEntity({ id: blookId });
    }
}
