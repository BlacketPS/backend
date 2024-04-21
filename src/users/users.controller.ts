import { ClassSerializerInterceptor, Controller, Get, Param, NotFoundException, UseInterceptors } from "@nestjs/common";
import { UsersService } from "./users.service";
import { GetCurrentUser } from "src/core/decorator/getUser.decorator";

import { ApiTags } from "@nestjs/swagger";
import { User, NotFound, PublicUser } from "blacket-types";

@ApiTags("users")
@Controller("users")
export class UsersController {
    constructor(
        private usersService: UsersService
    ) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get("me")
    async getMe(@GetCurrentUser() user: User) {
        if (!user) throw new NotFoundException(NotFound.UNKNOWN_USER);
        else return { user: new PublicUser(user.toJSON()) };
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @Get(":user")
    async getUser(@Param("user") user: string) {
        const userData = await this.usersService.getUser(user);

        if (!userData) throw new NotFoundException(NotFound.UNKNOWN_USER);
        else return { user: new PublicUser(userData.toJSON()) };
    }
}
