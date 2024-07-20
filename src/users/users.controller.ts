import { ClassSerializerInterceptor, Controller, Get, Param, NotFoundException, UseInterceptors } from "@nestjs/common";
import { UsersService } from "./users.service";
import { GetCurrentUser } from "src/core/decorator/getCurrentUser.decorator";

import { ApiTags } from "@nestjs/swagger";
import { User, NotFound, PrivateUser, PublicUser } from "blacket-types";

@ApiTags("users")
@Controller("users")
export class UsersController {
    constructor(
        private usersService: UsersService
    ) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get("me")
    async getMe(@GetCurrentUser() userId: User["id"]) {
        const userData = await this.usersService.getUser(userId, {
            cacheUser: false,
            includeBanners: true,
            includeBlooksCurrent: true,
            includeItemsCurrent: true,
            includeSettings: true,
            includeStatistics: true,
            includeTitles: true
        });

        if (!userData) throw new NotFoundException(NotFound.UNKNOWN_USER);
        else return new PrivateUser(typeof userData.toJSON === "function" ? userData.toJSON() : userData);
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get(":user")
    async getUser(@Param("user") user: string) {
        const userData = await this.usersService.getUser(user, {
            cacheUser: true,
            includeBanners: true,
            includeBlooksCurrent: true,
            includeItemsCurrent: true,
            includeStatistics: true,
            includeTitles: true
        });

        if (!userData) throw new NotFoundException(NotFound.UNKNOWN_USER);
        else return new PublicUser(typeof userData.toJSON === "function" ? userData.toJSON() : userData);
    }
}
