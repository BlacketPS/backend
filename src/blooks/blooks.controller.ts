import { Body, ClassSerializerInterceptor, Controller, HttpCode, HttpStatus, Put, UseInterceptors } from "@nestjs/common";
import { BlooksService } from "./blooks.service";
import { GetCurrentUserId } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { SellBlookDto } from "blacket-types";

@ApiTags("blooks")
@Controller("blooks")
export class BlooksController {
    constructor(
        private readonly blooksService: BlooksService
    ) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Put("sell-blooks")
    @HttpCode(HttpStatus.NO_CONTENT)
    sellBlooks(@GetCurrentUserId() userId: string, @Body() dto: SellBlookDto) {
        return this.blooksService.sellBlooks(userId, dto);
    }
}
