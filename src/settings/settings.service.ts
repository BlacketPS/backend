import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";
import { hash, compare } from "bcrypt";
import * as speakEasy from "@levminer/speakeasy";
import { SettingsChangeSettingDto, SettingsChangeUsernameDto, SettingsChangePasswordDto, BadRequest, NotFound, AuthAuthEntity, SettingsEnableOtpDto, SettingsDisableOtpDto } from "@blacket/types";
import { SettingFriendRequest, User } from "@blacket/core";

@Injectable()
export class SettingsService {
    // TODO: get these settings and their types from the database dynamically
    private validSettings: { [key: string]: any } = {
        "openPacksInstantly": Boolean,
        "friendRequests": SettingFriendRequest,
        "categoriesClosed": Array
    };

    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private authService: AuthService,
        private usersService: UsersService
    ) { }

    async changeSetting(userId: string, dto: SettingsChangeSettingDto): Promise<void> {
        if (!Object.keys(this.validSettings).includes(dto.key)) throw new NotFoundException(NotFound.UNKNOWN_SETTING);

        switch (typeof this.validSettings[dto.key]) {
            case "function":
                if (typeof dto.value !== typeof this.validSettings[dto.key]()) throw new BadRequestException(BadRequest.SETTINGS_INVALID_SETTING_VALUE);
                break;
            case "object":
                if (!Object.keys(this.validSettings[dto.key]).includes(dto.value)) throw new BadRequestException(BadRequest.SETTINGS_INVALID_SETTING_VALUE);
                break;
            default:
                if (typeof dto.value !== typeof this.validSettings[dto.key]) throw new BadRequestException(BadRequest.SETTINGS_INVALID_SETTING_VALUE);
                break;
        }

        await this.prismaService.userSetting.update({ where: { id: userId }, data: { [dto.key]: dto.value } });
    }

    async changeUsername(userId: string, dto: SettingsChangeUsernameDto): Promise<void> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.password, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        if (await this.usersService.userExists(dto.newUsername)) throw new BadRequestException(BadRequest.AUTH_USERNAME_TAKEN);

        await this.prismaService.user.update({ data: { username: dto.newUsername }, where: { id: userId } })
            .catch((err) => {
                throw new BadRequestException(err.errors[0].message ?? BadRequest.DEFAULT);
            });
    }

    async changePassword(userId: string, dto: SettingsChangePasswordDto): Promise<AuthAuthEntity> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.oldPassword, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        await this.authService.destroySession(userId);

        await this.prismaService.user.update({ data: { password: await hash(dto.newPassword, 10) }, where: { id: userId } });

        return { token: await this.authService.sessionToToken(await this.authService.findOrCreateSession(userId)) } as AuthAuthEntity;
    }

    async enableOtp(userId: string, dto: SettingsEnableOtpDto): Promise<void> {
        const tempOtp = (await this.redisService.getKey("tempOtp", userId) as { secret: string })?.secret;
        if (!tempOtp) throw new NotFoundException(NotFound.UNKNOWN_OTP);

        const otpCode = dto.otpCode.toUpperCase();

        const verified = speakEasy.totp.verify({ secret: tempOtp, token: otpCode, encoding: "base32" });
        if (!verified) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { settings: true } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.settings.otpSecret) throw new BadRequestException(BadRequest.SETTINGS_OTP_ALREADY_ENABLED);

        await this.prismaService.userSetting.update({ data: { otpSecret: tempOtp }, where: { id: userId } });
    }

    async disableOtp(userId: string, dto: SettingsDisableOtpDto): Promise<void> {
        const user = await this.prismaService.user.findUnique({ where: { id: userId }, include: { settings: true } });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!user.settings.otpSecret) throw new NotFoundException(NotFound.UNKNOWN_OTP);

        const verified = speakEasy.totp.verify({ secret: user.settings.otpSecret, token: dto.otpCode, encoding: "base32" });
        if (!verified) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        await this.prismaService.userSetting.update({ data: { otpSecret: null }, where: { id: userId } });
    }
}
