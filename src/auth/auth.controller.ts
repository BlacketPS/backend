import { Body, Controller, Delete, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto";
import { GetCurrentUserId, Public, RealIp } from "src/core/decorator";
import { AuthTokenEntity } from "blacket-types";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { BadRequest, InternalServerError, NotFound } from "src/types/enums";

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
        type: AuthTokenEntity
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.AUTH_FORMS_ENABLED
    }, { overrideExisting: false })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.USERNAME_TAKEN
    }, { overrideExisting: false })
    @ApiResponse({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: InternalServerError.DEFAULT
    })
    register(@Body() dto: RegisterDto, @RealIp() ip: string): Promise<AuthTokenEntity> {
        return this.authService.register(dto, ip);
    }

    @Public()
    @Post("login")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Successfully logged in",
        type: AuthTokenEntity
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: BadRequest.AUTH_INCORRECT_PASSWORD
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: NotFound.UNKNOWN_USER
    })
    login(@Body() dto: LoginDto, @RealIp() ip: string): Promise<AuthTokenEntity> {
        return this.authService.login(dto, ip);
    }

    @Delete("logout")
    @HttpCode(HttpStatus.RESET_CONTENT)
    logout(@GetCurrentUserId() userId: string): Promise<void> {
        return this.authService.logout(userId);
    }
}

