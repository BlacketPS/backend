import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class FriendsService {
	constructor(
		private prismaService: PrismaService
	) { }

	blockFriend(id: string) {
		throw new Error("Method not implemented.");
	}

	// TODO: Properly implement the removeFriend method
	async removeFriend(userId: string, friendId: string) {
		if (!await this.prismaService.user.findFirst({ where: { id: userId, friends: { some: { id: friendId } } } })) throw new Error("User is not a friend.");

		const user = await this.prismaService.user.findUnique({ where: { id: friendId }, select: { id: true } });

		if (!user) throw new Error("User not found.");

		await this.prismaService.user.update({
			where: { id: userId },
			data: {
				friends: {
					disconnect: {
						id: friendId
					}
				}
			}
		});
	}

	async addFriend(userId: string, friendId: string) {
		if (await this.prismaService.user.findFirst({ where: { id: userId, friends: { some: { id: friendId } } } })) throw new Error("User is already a friend.");

		const user = await this.prismaService.user.findUnique({ where: { id: friendId }, select: { id: true } });

		if (!user) throw new Error("User not found.");

		await this.prismaService.user.update({
			where: { id: userId },
			data: {
				friends: {
					connect: {
						id: friendId
					}
				}
			}
		});
	}

	getFriends() {
		throw new Error("Method not implemented.");
	}
}
