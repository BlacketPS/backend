import { Body, ClassSerializerInterceptor, Controller, HttpCode, HttpStatus, Patch, Post, UseInterceptors } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { GetCurrentUser, Permissions } from "src/core/decorator";
import { ApiTags } from "@nestjs/swagger";

import { SettingsChangeSettingDto, SettingsChangeUsernameDto, SettingsChangePasswordDto, SettingsEnableOtpDto, SettingsDisableOtpDto, Forbidden, PermissionTypeEnum, SettingsChangeChatColorDto } from "@blacket/types";

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService
    ) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch()
    @HttpCode(HttpStatus.NO_CONTENT)
    changeSetting(@GetCurrentUser() userId: string, @Body() dto: SettingsChangeSettingDto) {
        return this.settingsService.changeSetting(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Permissions({ permissions: [PermissionTypeEnum.CHANGE_USERNAME], message: Forbidden.SETTINGS_REVOKED_CHANGE_USERNAME })
    @Patch("username")
    @HttpCode(HttpStatus.NO_CONTENT)
    changeUsername(@GetCurrentUser() userId: string, @Body() dto: SettingsChangeUsernameDto) {
        return this.settingsService.changeUsername(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("password")
    changePassword(@GetCurrentUser() userId: string, @Body() dto: SettingsChangePasswordDto) {
        return this.settingsService.changePassword(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("chat-color")
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions({ permissions: [PermissionTypeEnum.USE_CHAT_COLORS] })
    changeChatColor(@GetCurrentUser() userId: string, @Body() dto: SettingsChangeChatColorDto) {
        return this.settingsService.changeChatColor(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("otp/enable")
    @HttpCode(HttpStatus.NO_CONTENT)
    enableOtp(@GetCurrentUser() userId: string, @Body() dto: SettingsEnableOtpDto) {
        return this.settingsService.enableOtp(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("otp/disable")
    @HttpCode(HttpStatus.NO_CONTENT)
    disableOtp(@GetCurrentUser() userId: string, @Body() dto: SettingsDisableOtpDto) {
        return this.settingsService.disableOtp(userId, dto);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Post("resend-verification")
    @HttpCode(HttpStatus.NO_CONTENT)
    resendVerification(@GetCurrentUser() userId: string) {
        return this.settingsService.sendVerificationEmail(userId);
    }
}
