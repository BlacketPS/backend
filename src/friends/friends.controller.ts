import { Controller, Get, Param, Post } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { ApiTags } from "@nestjs/swagger";
import { GetCurrentUser } from "src/core/decorator";

@ApiTags("friends")
@Controller("friends")
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

	@Get()
	getFriends() {
		return this.friendsService.getFriends();
	}

	@Post(":id/add")
	addFriend(@GetCurrentUser() userId: string, @Param("id") id: string) {
		try {
			return this.friendsService.addFriend(userId, id);
		} catch (error) {
			throw new Error(error.message);
		}
	}

	@Post(":id/remove")
	removeFriend(@GetCurrentUser() userId: string, @Param("id") id: string) {
		return this.friendsService.removeFriend(userId, id);
	}

	@Post(":id/block")
	blockFriend(@Param("id") id: string) {
		return this.friendsService.blockFriend(id);
	}
}
