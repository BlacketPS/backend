import { Body, Controller, Delete, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GetCurrentUserId, Public, RealIp } from "src/core/decorator";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthEntity, OtpAuthEntity, BadRequest, InternalServerError, NotFound } from "blacket-types";
import { RegisterDto, LoginDto } from "./dto";

@Controller("auth")
@ApiTags("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @Public()
    @Post("register")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully registered account",
        type: AuthEntity
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.AUTH_FORMS_ENABLED
    }, { overrideExisting: false })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.AUTH_USERNAME_TAKEN
    }, { overrideExisting: false })
    @ApiResponse({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: InternalServerError.DEFAULT
    })
    register(@Body() dto: RegisterDto, @RealIp() ip: string): Promise<AuthEntity> {
        return this.authService.register(dto, ip);
    }

    @Public()
    @Post("login")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully logged in",
        type: AuthEntity
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.AUTH_INCORRECT_PASSWORD
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: NotFound.UNKNOWN_USER
    })
    login(@Body() dto: LoginDto, @RealIp() ip: string): Promise<AuthEntity> {
        return this.authService.login(dto, ip);
    }

    @Delete("logout")
    @ApiResponse({
        status: HttpStatus.RESET_CONTENT,
        description: "Successfully logged out"
    })
    @HttpCode(HttpStatus.RESET_CONTENT)
    logout(@GetCurrentUserId() userId: string): Promise<void> {
        return this.authService.logout(userId);
    }

    @Post("otp/generate")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully generated OTP secret",
        type: OtpAuthEntity
    })
    async generateOtpSecret(@GetCurrentUserId() userId: string): Promise<OtpAuthEntity> {
        const otpSecret = await this.authService.generateOtpSecret(userId);

        return new OtpAuthEntity({ otpSecret });
    }
}

