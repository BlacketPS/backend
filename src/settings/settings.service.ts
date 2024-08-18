import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";
import { Repository } from "sequelize-typescript";
import { hash, compare } from "bcrypt";
import * as speakEasy from "speakeasy";

import { User, UserSetting, SettingsChangeSettingDto, SettingsChangeUsernameDto, SettingsChangePasswordDto, BadRequest, NotFound, AuthAuthEntity, SettingsEnableOtpDto, SettingsDisableOtpDto } from "blacket-types";

@Injectable()
export class SettingsService {
    private userRepo: Repository<User>;
    private userSettingRepo: Repository<UserSetting>;

    private validSettings: string[];
    private invalidSettings: string[] = ["id", "otpSecret"];

    constructor(
        private sequelizeService: PrismaService,
        private redisService: RedisService,
        private authService: AuthService,
        private usersService: UsersService
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userSettingRepo = this.sequelizeService.getRepository(UserSetting);

        this.validSettings = Object.keys(new this.userSettingRepo().dataValues).filter((setting: string) => !this.invalidSettings.includes(setting));
    }

    async changeSetting(userId: User["id"], dto: SettingsChangeSettingDto): Promise<void> {
        if (!this.validSettings.includes(dto.key)) throw new NotFoundException(NotFound.UNKNOWN_SETTING);
        if (typeof new this.userSettingRepo().dataValues[dto.key] !== typeof dto.value) throw new BadRequestException(BadRequest.SETTINGS_INVALID_SETTING_VALUE);

        const userSetting = await this.userSettingRepo.findOne({ where: { id: userId } });
        if (!userSetting) throw new NotFoundException(NotFound.UNKNOWN_USER);

        userSetting[dto.key] = dto.value;

        await userSetting.save()
            .catch((err) => {
                throw new BadRequestException(err.errors[0].message ?? BadRequest.DEFAULT);
            });
    }

    async changeUsername(userId: User["id"], dto: SettingsChangeUsernameDto): Promise<void> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.password, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        if (await this.usersService.userExists(dto.newUsername)) throw new BadRequestException(BadRequest.AUTH_USERNAME_TAKEN);

        await this.userRepo.update({ username: dto.newUsername }, { where: { id: userId } })
            .catch((err) => {
                throw new BadRequestException(err.errors[0].message ?? BadRequest.DEFAULT);
            });
    }

    async changePassword(userId: User["id"], dto: SettingsChangePasswordDto): Promise<AuthAuthEntity> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.oldPassword, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        await this.authService.destroySession(userId);

        await this.userRepo.update({ password: await hash(dto.newPassword, 10) }, { where: { id: userId } });

        return { token: await this.authService.sessionToToken(await this.authService.findOrCreateSession(userId)) } as AuthAuthEntity;
    }

    async enableOtp(userId: User["id"], dto: SettingsEnableOtpDto): Promise<void> {
        const tempOtp = await this.redisService.getKey("tempOtp", userId);
        if (!tempOtp) throw new NotFoundException(NotFound.UNKNOWN_OTP);

        const verified = speakEasy.totp.verify({ secret: tempOtp, token: dto.otpCode, encoding: "base32" });
        if (!verified) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.settings.otpSecret) throw new BadRequestException(BadRequest.SETTINGS_OTP_ALREADY_ENABLED);

        await this.userSettingRepo.update({ otpSecret: tempOtp }, { where: { id: userId } });
    }

    async disableOtp(userId: User["id"], dto: SettingsDisableOtpDto): Promise<void> {
        const user = await this.usersService.getUser(userId, { includeSettings: true });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!user.settings.otpSecret) throw new NotFoundException(NotFound.UNKNOWN_OTP);

        const verified = speakEasy.totp.verify({ secret: user.settings.otpSecret, token: dto.otpCode, encoding: "base32" });
        if (!verified) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        await this.userSettingRepo.update({ otpSecret: null }, { where: { id: userId } });
    }
}
