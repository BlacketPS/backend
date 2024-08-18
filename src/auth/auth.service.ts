import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { UsersService } from "src/users/users.service";
import { ConfigService } from "@nestjs/config";
import { Repository } from "sequelize-typescript";
import { type Transaction, Op } from "sequelize";
import { compare } from "bcrypt";
import * as speakEasy from "speakeasy";

import { AuthAuthEntity, BadRequest, Forbidden, NotFound, PunishmentType, Session, Unauthorized, User, UserPunishment, UserSetting } from "blacket-types";
import { RegisterDto, LoginDto } from "./dto";

@Injectable()
export class AuthService {
    private userRepo: Repository<User>;
    private userPunishmentRepo: Repository<UserPunishment>;
    private userSettingRepo: Repository<UserSetting>;
    private sessionRepo: Repository<Session>;

    constructor(
        private sequelizeService: PrismaService,
        private redisService: RedisService,
        private usersService: UsersService,
        private configService: ConfigService,
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userPunishmentRepo = this.sequelizeService.getRepository(UserPunishment);
        this.userSettingRepo = this.sequelizeService.getRepository(UserSetting);
        this.sessionRepo = this.sequelizeService.getRepository(Session);
    }

    async register(dto: RegisterDto, ip: string): Promise<AuthAuthEntity> {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") === "true") throw new BadRequestException(BadRequest.AUTH_FORMS_ENABLED);

        const transaction = await this.sequelizeService.transaction();

        if (await this.usersService.userExists(dto.username, transaction)) throw new BadRequestException(BadRequest.AUTH_USERNAME_TAKEN);

        const user = await this.usersService.createUser(dto.username, dto.password, transaction);

        await this.usersService.updateUserIp(user, ip, transaction);

        const session = await this.findOrCreateSession(user.id, transaction);

        return await transaction.commit().then(async () => {
            return { token: await this.sessionToToken(session) } as AuthAuthEntity;
        });
    }

    async login(dto: LoginDto, ip: string): Promise<AuthAuthEntity> {
        const user = await this.userRepo.findOne({
            where: { username: dto.username }, include: [
                { model: this.userSettingRepo },
                { model: this.userPunishmentRepo, as: "punishments", where: { type: PunishmentType.BAN, expiresAt: { [Op.gt]: new Date() } }, order: [["createdAt", "DESC"]], limit: 1, required: false }
            ]
        });

        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.password, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        // otp stuff is here
        if (user.settings.otpSecret && !dto.otpCode) throw new UnauthorizedException(Unauthorized.AUTH_MISSING_OTP);
        else if (user.settings.otpSecret && !speakEasy.totp.verify({ secret: user.settings.otpSecret, encoding: "base32", token: dto.otpCode })) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        if (user.punishments.length > 0) throw new ForbiddenException(
            Forbidden.AUTH_BANNED
                .replace("%s", user.punishments[0].reason)
                .replace("%s", `${user.punishments[0].expiresAt.getTime() - Date.now() > 1000 * 60 * 60 * 24 * 365
                    ? "never"
                    : `on ${user.punishments[0].expiresAt.toLocaleDateString()} at ${user.punishments[0].expiresAt.toLocaleTimeString()} UTC`
                    }`)
        );

        await this.usersService.updateUserIp(user, ip);

        const session = await this.findOrCreateSession(user.id);
        return { token: await this.sessionToToken(session) } as AuthAuthEntity;
    }

    async logout(userId: User["id"]): Promise<void> {
        return await this.destroySession(userId);
    }

    async generateOtpSecret(userId: User["id"]): Promise<string> {
        if (await this.redisService.getKey("tempOtp", userId)) return await this.redisService.getKey("tempOtp", userId);

        const user = await this.usersService.getUser(userId, { includeSettings: true });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.settings.otpSecret) throw new BadRequestException(BadRequest.AUTH_OTP_ALREADY_ENABLED);

        const secret = speakEasy.generateSecret({ name: user.username, issuer: process.env.VITE_INFORMATION_NAME });

        await this.redisService.setKey("tempOtp", userId, secret.base32, 300);

        return secret.base32;
    }

    async findOrCreateSession(userId: User["id"], transaction?: Transaction): Promise<Session> {
        const [session] = await this.sessionRepo.findOrCreate({ where: { userId }, defaults: { userId }, transaction });

        await this.redisService.setSession(session.userId, session);

        return session;
    }

    async destroySession(userId: User["id"]): Promise<void> {
        const session = await this.sessionRepo.findOne({ where: { userId } });

        if (session) {
            this.redisService.deleteSession(session.userId);

            session.destroy();
        }
    }

    async sessionToToken(session: Session): Promise<string> {
        return Buffer.from(JSON.stringify(session)).toString("base64");
    }
}
