import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";
import { BlacketLoggerService } from "src/core/logger/logger.service";
import { hash, compare } from "bcrypt";
import * as speakEasy from "@levminer/speakeasy";
import { SettingsChangeSettingDto, SettingsChangeUsernameDto, SettingsChangePasswordDto, BadRequest, NotFound, AuthAuthEntity, SettingsEnableOtpDto, SettingsDisableOtpDto } from "@blacket/types";

@Injectable()
export class SettingsService {
    private validSettings: { [key: string]: any } = {};

    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService,
        private readonly authService: AuthService,
        private readonly usersService: UsersService,

        private readonly logger: BlacketLoggerService
    ) {
        this.initializeValidSettings();
    }

    private async initializeValidSettings() {
        const settings = await this.prismaService.userSetting.findMany({
            omit: {
                otpSecret: true
            }
        });

        for (const setting of settings) {
            this.validSettings = { ...this.validSettings, ...setting };
        }

        this.logger.log(`Initialized valid settings: ${Object.keys(this.validSettings).join(", ")}`, "SettingsService");
    }

    async changeSetting(userId: string, dto: SettingsChangeSettingDto): Promise<void> {
        if (!Object.keys(this.validSettings).includes(dto.key)) throw new NotFoundException(NotFound.UNKNOWN_SETTING);

        switch (typeof this.validSettings[dto.key]) {
            case "function":
                if (typeof dto.value !== typeof this.validSettings[dto.key]()) throw new BadRequestException(BadRequest.SETTINGS_INVALID_SETTING_VALUE);
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
