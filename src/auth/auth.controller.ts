import { Body, Controller, Delete, ForbiddenException, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { GetCurrentUser, Public, RealIp } from "src/core/decorator";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthAuthEntity, AuthOtpEntity, BadRequest, Forbidden, InternalServerError, NotFound } from "@blacket/types";
import { RegisterDto, LoginDto } from "./dto";

@Controller("auth")
@ApiTags("auth")
export class AuthController {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) { }

    @Public()
    @Post("register")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully registered account",
        type: AuthAuthEntity
    })
    @ApiResponse({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: InternalServerError.DEFAULT
    })
    async register(@Body() dto: RegisterDto, @RealIp() ip: string): Promise<AuthAuthEntity> {
        if (this.configService.get("SERVER_REGISTRATION_ENABLED") !== "true") {
            if (dto.password !== this.configService.get("SERVER_REGISTRATION_BYPASS_PASSWORD")) throw new ForbiddenException(Forbidden.DEFAULT);
        }

        return this.authService.register(dto, ip);
    }

    @Public()
    @Post("login")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully logged in",
        type: AuthAuthEntity
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.AUTH_INCORRECT_PASSWORD
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: NotFound.UNKNOWN_USER
    })
    login(@Body() dto: LoginDto, @RealIp() ip: string): Promise<AuthAuthEntity> {
        return this.authService.login(dto, ip);
    }

    @Delete("logout")
    @ApiResponse({
        status: HttpStatus.RESET_CONTENT,
        description: "Successfully logged out"
    })
    @HttpCode(HttpStatus.RESET_CONTENT)
    logout(@GetCurrentUser() userId: string): Promise<void> {
        return this.authService.logout(userId);
    }

    @Post("otp/generate")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully generated OTP secret",
        type: AuthOtpEntity
    })
    async generateOtpSecret(@GetCurrentUser() userId: string): Promise<AuthOtpEntity> {
        const otpSecret = await this.authService.generateOtpSecret(userId);

        return new AuthOtpEntity({ otpSecret });
    }
}

