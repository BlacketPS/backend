import { ClassSerializerInterceptor, Controller, Get, Param, NotFoundException, UseInterceptors, Post, UploadedFile, UsePipes } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CoreService } from "src/core/core.service";
import { GetCurrentUser } from "src/core/decorator/getCurrentUser.decorator";

import { ApiTags } from "@nestjs/swagger";
import { NotFound, PrivateUser, PublicUser } from "@blacket/types";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileSizeValidationPipe } from "src/core/pipe";
import { Permissions } from "src/core/decorator";
import { PermissionType } from "@prisma/client";

@ApiTags("users")
@Controller("users")
export class UsersController {
    constructor(
        private usersService: UsersService,
        private coreService: CoreService
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

    @Get("transactions")
    async getTransactions(@GetCurrentUser() userId: string) {
        return this.usersService.getTransactions(userId);
    }
}
