import { Body, Controller, HttpCode, HttpStatus, Patch } from "@nestjs/common";
import { CosmeticsService } from "./cosmetics.service";
import { ApiTags } from "@nestjs/swagger";
import { Throttle, seconds } from "@nestjs/throttler";
import { GetCurrentUser, Permissions } from "src/core/decorator";
import { CosmeticsChangeAvatarDto, CosmeticsChangeBannerDto, CosmeticsChangeColorTier1Dto, CosmeticsChangeColorTier2Dto, CosmeticsChangeFontDto, CosmeticsChangeTitleDto, PermissionTypeEnum } from "@blacket/types";

@ApiTags("cosmetics")
@Controller("cosmetics")
@Throttle({ default: { limit: 10, ttl: seconds(10) } })
export class CosmeticsController {
    constructor(
        private cosmeticsService: CosmeticsService
    ) { }

    @Patch("avatar")
    @HttpCode(HttpStatus.NO_CONTENT)
    changeAvatar(@GetCurrentUser() userId: string, @Body() dto: CosmeticsChangeAvatarDto) {
        return this.cosmeticsService.changeAvatar(userId, dto);
    }

    @Patch("banner")
    @HttpCode(HttpStatus.NO_CONTENT)
    changeBanner(@GetCurrentUser() userId: string, @Body() dto: CosmeticsChangeBannerDto) {
        return this.cosmeticsService.changeBanner(userId, dto);
    }

    @Patch("title")
    @HttpCode(HttpStatus.NO_CONTENT)
    changeTitle(@GetCurrentUser() userId: string, @Body() dto: CosmeticsChangeTitleDto) {
        return this.cosmeticsService.changeTitle(userId, dto);
    }

    @Patch("color/1")
    @Permissions({ permissions: [PermissionTypeEnum.CHANGE_NAME_COLOR_TIER_1] })
    @HttpCode(HttpStatus.NO_CONTENT)
    changeColorTier1(@GetCurrentUser() userId: string, @Body() dto: CosmeticsChangeColorTier1Dto) {
        return this.cosmeticsService.changeColorTier1(userId, dto);
    }

    @Patch("color/2")
    @Permissions({ permissions: [PermissionTypeEnum.CHANGE_NAME_COLOR_TIER_2] })
    @HttpCode(HttpStatus.NO_CONTENT)
    changeColorTier2(@GetCurrentUser() userId: string, @Body() dto: CosmeticsChangeColorTier2Dto) {
        return this.cosmeticsService.changeColorTier2(userId, dto);
    }

    @Patch("font")
    @Permissions({ permissions: [PermissionTypeEnum.CHANGE_FONT] })
    @HttpCode(HttpStatus.NO_CONTENT)
    changeFont(@GetCurrentUser() userId: string, @Body() dto: CosmeticsChangeFontDto) {
        return this.cosmeticsService.changeFont(userId, dto);
    }
}
