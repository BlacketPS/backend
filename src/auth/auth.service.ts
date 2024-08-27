import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { UsersService } from "src/users/users.service";
import { ConfigService } from "@nestjs/config";
import { compare } from "bcrypt";
import * as speakEasy from "@levminer/speakeasy";

import { AuthAuthEntity, BadRequest, Forbidden, NotFound, Unauthorized } from "@blacket/types";
import { RegisterDto, LoginDto } from "./dto";
import { Prisma, PrismaClient, PunishmentType, Session, User } from "@blacket/core";
import { DefaultArgs } from "@prisma/client/runtime/library";

@Injectable()
export class AuthService {
    constructor(
        private prismaService: PrismaService,
        private redisService: RedisService,
        private usersService: UsersService,
        private configService: ConfigService,
    ) { }

    async register(dto: RegisterDto, ip: string): Promise<AuthAuthEntity> {
        if (this.configService.get<string>("VITE_USER_FORMS_ENABLED") === "true") throw new BadRequestException(BadRequest.AUTH_FORMS_ENABLED);

        if (await this.usersService.userExists(dto.username)) throw new BadRequestException(BadRequest.AUTH_USERNAME_TAKEN);
        return await this.prismaService.$transaction(async (prisma) => {
            const user = await this.usersService.createUser(dto.username, dto.password, prisma);

            await this.usersService.updateUserIp(user, ip, prisma);

            const session = await this.findOrCreateSession(user.id, prisma);

            return { token: await this.sessionToToken(session) } as AuthAuthEntity;
        });
    }

    async login(dto: LoginDto, ip: string): Promise<AuthAuthEntity> {
        const user = await this.prismaService.user.findUnique({
            where: { username: dto.username },
            include: { settings: true, punishments: { where: { type: PunishmentType.BAN, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } } }
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

        return { token: await this.sessionToToken(await this.findOrCreateSession(user.id)) } as AuthAuthEntity;
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

    async findOrCreateSession(userId: User["id"], transaction?: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">): Promise<Session> {
        const prisma = transaction || this.prismaService;

        const session = await prisma.session.upsert({
            where: { userId },
            create: { user: { connect: { id: userId } } },
            update: {}
        });
        await this.redisService.setSession(session.userId, session);

        return session;
    }

    async destroySession(userId: User["id"]): Promise<void> {
        const session = await this.prismaService.session.findUnique({ where: { userId } });

        if (session) {
            this.redisService.deleteSession(session.userId);

            await this.prismaService.session.delete({ where: { id: session.id } });
        }
    }

    async sessionToToken(session: Session): Promise<string> {
        return Buffer.from(JSON.stringify(session)).toString("base64");
    }
}
