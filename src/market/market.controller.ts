import { Body, ClassSerializerInterceptor, Controller, Post, UseInterceptors } from "@nestjs/common";
import { MarketService } from "./market.service";
import { GetCurrentUser, Permissions } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { OpenPackBlookEntity, OpenPackDto, Permission } from "blacket-types";

@ApiTags("market")
@Controller("market")
export class MarketController {
    constructor(private readonly marketService: MarketService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("open-pack")
    async openPack(@GetCurrentUser() userId: string, @Body() dto: OpenPackDto) {
        const blookId: number = await this.marketService.openPack(userId, dto);

        return new OpenPackBlookEntity({ id: blookId });
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("gimme-item")
    gimmeItem(@GetCurrentUser() userId: string) {
        return this.marketService.gimmeItem(userId);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Permissions([Permission.BAN_USERS])
    @Post("test")
    test() {
        return "test";
    }
}
