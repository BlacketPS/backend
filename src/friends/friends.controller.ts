import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { ApiTags } from "@nestjs/swagger";
import { GetCurrentUser } from "src/core/decorator";

@ApiTags("friends")
@Controller("friends")
export class FriendsController {
    constructor(private readonly friendsService: FriendsService) { }

    @Get("/")
    getFriends(@GetCurrentUser() userId: string) {
        try {
            return this.friendsService.getFriends(userId);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    @Post(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    addFriend(@GetCurrentUser() userId: string, @Param("id") id: string) {
        try {
            return this.friendsService.addFriend(userId, id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    removeFriend(@GetCurrentUser() userId: string, @Param("id") id: string) {
        try {
            return this.friendsService.removeFriend(userId, id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    @Post(":id/block")
    @HttpCode(HttpStatus.NO_CONTENT)
    blockUser(@GetCurrentUser() userId: string, @Param("id") id: string) {
        try {
            return this.friendsService.blockUser(userId, id);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    @Post(":id/unblock")
    unblockUser(@GetCurrentUser() userId: string, @Param("id") id: string) {
        try {
            return this.friendsService.unblockUser(userId, id);
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
