import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "src/users/users.service";
import { User, UserSetting } from "src/models";
import { Repository } from "sequelize-typescript";
import { hash, compare } from "bcrypt";
import * as speakEasy from "speakeasy";

import { ChangeSettingDto, ChangeUsernameDto, ChangePasswordDto, BadRequest, NotFound, AuthEntity, EnableOtpDto, DisableOtpDto } from "blacket-types";

@Injectable()
export class SettingsService {
    private userSettingRepo: Repository<UserSetting>;

    private validSettings: string[];
    private invalidSettings: string[] = ["id", "otpSecret"];

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService,
        private authService: AuthService,
        private usersService: UsersService
    ) {
        this.userSettingRepo = this.sequelizeService.getRepository(UserSetting);
        this.validSettings = Object.keys(new this.userSettingRepo().dataValues).filter((setting: string) => !this.invalidSettings.includes(setting));
    }

    async changeSetting(userId: User["id"], dto: ChangeSettingDto): Promise<void> {
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

    async changeUsername(userId: User["id"], dto: ChangeUsernameDto): Promise<void> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.password, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        if (await this.usersService.userExists(dto.newUsername)) throw new BadRequestException(BadRequest.AUTH_USERNAME_TAKEN);

        user.username = dto.newUsername;

        await user.save()
            .catch((err) => {
                throw new BadRequestException(err.errors[0].message ?? BadRequest.DEFAULT);
            });
    }

    async changePassword(userId: User["id"], dto: ChangePasswordDto): Promise<AuthEntity> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.oldPassword, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        user.password = await hash(dto.newPassword, 10);

        await this.authService.destroySession(userId);

        await user.save()
            .catch((err) => {
                throw new BadRequestException(err.errors[0].message ?? BadRequest.DEFAULT);
            });

        return { token: await this.authService.sessionToToken(await this.authService.findOrCreateSession(userId)) } as AuthEntity;
    }

    async enableOtp(userId: User["id"], dto: EnableOtpDto): Promise<void> {
        const tempOtp = await this.redisService.get(`blacket-tempOtp:${userId}`);
        if (!tempOtp) throw new NotFoundException(NotFound.UNKNOWN_OTP);

        const verified = speakEasy.totp.verify({ secret: tempOtp, token: dto.otpCode, encoding: "base32" });
        if (!verified) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.settings.otpSecret) throw new BadRequestException(BadRequest.SETTINGS_OTP_ALREADY_ENABLED);

        await this.userSettingRepo.update({ otpSecret: tempOtp }, { where: { id: userId } });
    }

    async disableOtp(userId: User["id"], dto: DisableOtpDto): Promise<void> {
        const user = await this.usersService.getUser(userId);
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!user.settings.otpSecret) throw new NotFoundException(NotFound.UNKNOWN_OTP);

        const verified = speakEasy.totp.verify({ secret: user.settings.otpSecret, token: dto.otpCode, encoding: "base32" });
        if (!verified) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        await this.userSettingRepo.update({ otpSecret: null }, { where: { id: userId } });
    }
}
