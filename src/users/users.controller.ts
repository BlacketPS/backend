import { ClassSerializerInterceptor, Controller, Get, Param, NotFoundException, UseInterceptors, Post, UploadedFile, UploadedFiles } from "@nestjs/common";
import { UsersService } from "./users.service";
import { GetCurrentUser } from "src/core/decorator/getCurrentUser.decorator";

import { ApiTags } from "@nestjs/swagger";
import { NotFound, PrivateUser, PublicUser } from "@blacket/types";
import { FileInterceptor } from "@nestjs/platform-express";

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
            includeStatistics: true
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

    @UseInterceptors(FileInterceptor("file"))
    @Post("upload")
    async uploadFile(@GetCurrentUser() userId: string, @UploadedFile() file: Express.Multer.File) {
        return await this.usersService.uploadFile(userId, file);
    }
}
