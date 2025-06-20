import { ClassSerializerInterceptor, Controller, Get, Param, NotFoundException, UseInterceptors, Patch, HttpStatus, HttpCode } from "@nestjs/common";
import { UsersService } from "./users.service";
import { GetCurrentUser } from "src/core/decorator/getCurrentUser.decorator";

import { ApiTags } from "@nestjs/swagger";
import { NotFound, PrivateUser, PublicUser } from "@blacket/types";
import { hours, seconds, Throttle } from "@nestjs/throttler";

@ApiTags("users")
@Controller("users")
export class UsersController {
    constructor(
        private usersService: UsersService
    ) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get("me")
    async getMe(@GetCurrentUser() userId: string) {
        const userData = await this.usersService.getUser(userId, {
            cacheUser: false,
            includeTitles: true,
            includeFonts: true,
            includeBanners: true,
            includeBlooksCurrent: true,
            includeDiscord: true,
            includeItemsCurrent: true,
            includeSettings: true,
            includePaymentMethods: true,
            includeSubscription: true,
            includeStatistics: true,
            includeRooms: true
        });

        if (!userData) throw new NotFoundException(NotFound.UNKNOWN_USER);
        else return new PrivateUser(userData);
    }

    @Throttle({ default: { limit: 10, ttl: seconds(60) } })
    @UseInterceptors(ClassSerializerInterceptor)
    @Get("transactions")
    async getTransactions(@GetCurrentUser() userId: string) {
        return this.usersService.getTransactions(userId);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get(":user")
    async getUser(@Param("user") user: string) {
        const userData = await this.usersService.getUser(user, {
            cacheUser: true,
            includeBlooksCurrent: true,
            includeDiscord: true,
            includeItemsCurrent: true,
            includeStatistics: true
        });

        if (!userData) throw new NotFoundException(NotFound.UNKNOWN_USER);
        else return new PublicUser(userData);
    }

    @Throttle({ default: { limit: 3, ttl: hours(24) } })
    @UseInterceptors(ClassSerializerInterceptor)
    @Patch("read-rules")
    @HttpCode(HttpStatus.NO_CONTENT)
    async readRules(@GetCurrentUser() userId: string) {
        return await this.usersService.readRules(userId);
    }
}
