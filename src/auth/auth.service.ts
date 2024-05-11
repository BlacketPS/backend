import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { UsersService } from "src/users/users.service";
import { ConfigService } from "@nestjs/config";
import { Repository } from "sequelize-typescript";
import { type Transaction } from "sequelize";
import { compare } from "bcrypt";
import * as speakEasy from "speakeasy";

import { AuthEntity, BadRequest, NotFound, Session, Unauthorized, User, UserSetting } from "blacket-types";
import { RegisterDto, LoginDto } from "./dto";

@Injectable()
export class AuthService {
    private userRepo: Repository<User>;
    private userSettingRepo: Repository<UserSetting>;
    private sessionRepo: Repository<Session>;

    constructor(
        private sequelizeService: SequelizeService,
        private redisService: RedisService,
        private usersService: UsersService,
        private configService: ConfigService,
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userSettingRepo = this.sequelizeService.getRepository(UserSetting);
        this.sessionRepo = this.sequelizeService.getRepository(Session);
    }

    async register(dto: RegisterDto, ip: string): Promise<AuthEntity> {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") === "true") throw new BadRequestException(BadRequest.AUTH_FORMS_ENABLED);

        const transaction: Transaction = await this.sequelizeService.transaction();

        if (await this.usersService.userExists(dto.username, transaction)) throw new BadRequestException(BadRequest.AUTH_USERNAME_TAKEN);

        const user = await this.usersService.createUser(dto.username, dto.password, transaction);

        await this.usersService.updateUserIp(user, ip, transaction);

        const session: Session = await this.findOrCreateSession(user.id, transaction);

        return await transaction.commit().then(async () => {
            return { token: await this.sessionToToken(session) } as AuthEntity;
        });
    }

    async login(dto: LoginDto, ip: string): Promise<AuthEntity> {
        const user: User = await this.userRepo.findOne({ where: { username: dto.username }, include: [{ model: this.userSettingRepo }] });

        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (!await compare(dto.password, user.password)) throw new BadRequestException(BadRequest.AUTH_INCORRECT_PASSWORD);

        // otp stuff is here
        if (user.settings.otpSecret && !dto.otpCode) throw new UnauthorizedException(Unauthorized.AUTH_MISSING_OTP);
        else if (user.settings.otpSecret && !speakEasy.totp.verify({ secret: user.settings.otpSecret, encoding: "base32", token: dto.otpCode })) throw new BadRequestException(BadRequest.AUTH_INCORRECT_OTP);

        const session: Session = await this.findOrCreateSession(user.id);

        await this.usersService.updateUserIp(user, ip);

        return { token: await this.sessionToToken(session) } as AuthEntity;
    }

    async logout(userId: User["id"]): Promise<void> {
        return await this.destroySession(userId);
    }

    async generateOtpSecret(userId: User["id"]): Promise<string> {
        if (await this.redisService.exists(`blacket-tempOtp:${userId}`)) return await this.redisService.get(`blacket-tempOtp:${userId}`);

        const user: User = await this.usersService.getUser(userId, { includeSettings: true });
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);

        if (user.settings.otpSecret) throw new BadRequestException(BadRequest.AUTH_OTP_ALREADY_ENABLED);

        const secret = speakEasy.generateSecret({ name: user.username, issuer: process.env.VITE_INFORMATION_NAME });

        await this.redisService.setex(`blacket-tempOtp:${userId}`, 300, secret.base32);

        return secret.base32;
    }

    async findOrCreateSession(userId: User["id"], transaction?: Transaction): Promise<Session> {
        const [session] = await this.sessionRepo.findOrCreate({ where: { userId }, defaults: { userId }, transaction });

        await this.redisService.set(`blacket-session:${session.userId}`, JSON.stringify(session));

        return session;
    }

    async destroySession(userId: User["id"]): Promise<void> {
        const session = await this.sessionRepo.findOne({ where: { userId } });

        if (session) {
            this.redisService.del(`blacket-session:${session.userId}`);

            session.destroy();
        }
    }

    async sessionToToken(session: Session): Promise<string> {
        return Buffer.from(JSON.stringify(session)).toString("base64");
    }
}
