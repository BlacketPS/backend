import { Body, Controller, HttpCode, HttpStatus, Put } from "@nestjs/common";
import { BlooksService } from "./blooks.service";
import { GetCurrentUser } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";
import { BlooksSellBlookDto } from "@blacket/types";

@ApiTags("blooks")
@Controller("blooks")
export class BlooksController {
    constructor(
        private readonly blooksService: BlooksService
    ) { }

    @Put("sell-blooks")
    @HttpCode(HttpStatus.NO_CONTENT)
    sellBlooks(
        @GetCurrentUser() userId: string,
        @Body() dto: BlooksSellBlookDto
    ) {
        return this.blooksService.sellBlooks(userId, dto);
    }
}
