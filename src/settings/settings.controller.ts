import { Body, ClassSerializerInterceptor, Controller, HttpCode, HttpStatus, Patch, UseInterceptors } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { GetCurrentUser } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";

import { ChangeSettingDto, ChangeUsernameDto, ChangePasswordDto, EnableOtpDto, DisableOtpDto } from "blacket-types";

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService
    ) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch()
    @HttpCode(HttpStatus.NO_CONTENT)
    changeSetting(@GetCurrentUser() userId: string, @Body() dto: ChangeSettingDto) {
        return this.settingsService.changeSetting(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("username")
    @HttpCode(HttpStatus.NO_CONTENT)
    changeUsername(@GetCurrentUser() userId: string, @Body() dto: ChangeUsernameDto) {
        return this.settingsService.changeUsername(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("password")
    changePassword(@GetCurrentUser() userId: string, @Body() dto: ChangePasswordDto) {
        return this.settingsService.changePassword(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("otp/enable")
    @HttpCode(HttpStatus.NO_CONTENT)
    enableOtp(@GetCurrentUser() userId: string, @Body() dto: EnableOtpDto) {
        return this.settingsService.enableOtp(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("otp/disable")
    @HttpCode(HttpStatus.NO_CONTENT)
    disableOtp(@GetCurrentUser() userId: string, @Body() dto: DisableOtpDto) {
        return this.settingsService.disableOtp(userId, dto);
    }
}
