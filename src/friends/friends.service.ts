import { Prisma, PrismaClient } from "@blacket/core";
import { Injectable } from "@nestjs/common";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class FriendsService {
    constructor(
        private prismaService: PrismaService
    ) { }

    _mappedFriends(friends: any[]) {
        return friends.map((friend) => {
            return {
                id: friend.id,
                username: friend.username
            };
        });
    }

    async blockUser(userId: string, friendId: string): Promise<void> {
        return await this.prismaService.$transaction(async (tx) => {
            await this.removeFriend(userId, friendId, tx);
            await this.removeFriend(friendId, userId, tx);

            const user = await tx.user.findUnique({ where: { id: friendId }, select: { id: true } });
            if (!user) throw new Error("User not found.");

            await tx.user.update({
                where: { id: userId },
                data: {
                    blocked: {
                        connect: {
                            id: friendId
                        }
                    }
                }
            });
        });
    }

    async unblockUser(userId: string, friendId: string): Promise<void> {
        // if (!await this.prismaService.user.findFirst({ where: { id: userId, blocked: { some: { id: friendId } } } })) throw new Error("User is not blocked.");
        if (!(await this.prismaService.user.count({
            where: { id: userId, blocked: { some: { id: friendId } } }
        }) > 0)) throw new Error("User is not blocked.");

        return await this.prismaService.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: friendId }, select: { id: true } });
            if (!user) throw new Error("User not found.");

            await tx.user.update({
                where: { id: userId },
                data: {
                    blocked: {
                        disconnect: {
                            id: friendId
                        }
                    }
                }
            });
        });
    }

    async removeFriend(userId: string, friendId: string, transaction: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> = this.prismaService): Promise<void> {
        // if (!await this.prismaService.user.findFirst({ where: { id: userId, friends: { some: { id: friendId } } } })) throw new Error("User is not a friend.");
        if (!(await transaction.user.count({
            where: { id: userId, friends: { some: { id: friendId } } }
        }) > 0)) throw new Error("User is not a friend.");

        const user = await transaction.user.findUnique({ where: { id: friendId }, select: { id: true } });
        if (!user) throw new Error("User not found.");

        await transaction.user.update({
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

    async addFriend(userId: string, friendId: string, transaction: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> = this.prismaService): Promise<void> {
        // if (await this.prismaService.user.findFirst({ where: { id: userId, friends: { some: { id: friendId } } } })) throw new Error("User is already a friend.");
        // if (await this.prismaService.user.findFirst({ where: { id: userId, blocked: { some: { id: friendId } } } })) throw new Error("User is blocked.");
        // count
        if (await transaction.user.count({
            where: { id: userId, friends: { some: { id: friendId } } }
        }) > 0) throw new Error("User is already a friend.");
        if (await transaction.user.count({
            where: { id: userId, blocked: { some: { id: friendId } } }
        }) > 0) throw new Error("User is blocked.");

        const user = await transaction.user.findUnique({ where: { id: friendId }, select: { id: true } });
        if (!user) throw new Error("User not found.");

        await transaction.user.update({
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

    async getFriends(userId: string) {
        const friends = await this.prismaService.user.findUnique({
            where: { id: userId },
            select: {
                friends: true,
                friendedBy: true,
                blocked: true
            }
        });
        if (!friends) throw new Error("User not found.");

        return {
            friends: this._mappedFriends(friends.friends),
            friendedBy: this._mappedFriends(friends.friendedBy),
            blocked: this._mappedFriends(friends.blocked)
        };
    }
}
