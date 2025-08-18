import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { SocketService } from "src/socket/socket.service";
import { PermissionsService } from "src/permissions/permissions.service";

import { ChatCreateMessageDto, ChatEditMessageDto, Forbidden, NotFound, SocketMessageType } from "@blacket/types";
import { Message, PunishmentType, PermissionType } from "@blacket/core";

@Injectable()
export class ChatService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService,
        private readonly socketService: SocketService,
        private readonly permissionsService: PermissionsService
    ) { }

    async getMessages(userId: string, roomId: number = 0, limit: number = 50) {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.id === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        return await this.prismaService.message.findMany({
            orderBy: {
                createdAt: "desc"
            },
            include: {
                replyingTo: {
                    select: {
                        id: true,
                        content: true,
                        authorId: true
                    }
                }
            },
            omit: {
                replyingToId: true
            },
            take: limit,
            where: {
                roomId: room.id,
                deletedAt: null
            }
        });
    }

    async createMessage(userId: string, roomId: number, dto: ChatCreateMessageDto): Promise<Message> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.id === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);
        else if (room.public) {
            const mute = await this.prismaService.punishment.findFirst({
                where: {
                    userId: userId,
                    type: PunishmentType.MUTE,
                    expiresAt: { gt: new Date() }
                },
                take: 1,
                orderBy: { createdAt: "desc" }
            });

            if (mute) throw new ForbiddenException(Forbidden.CHAT_MUTED
                .replace("%s", mute.reason)
                .replace("%s", `${mute.expiresAt.getTime() - Date.now() > 1000 * 60 * 60 * 24 * 365
                    ? "never"
                    : `on ${mute.expiresAt.toLocaleDateString()} at ${mute.expiresAt.toLocaleTimeString()} UTC`
                    }`)
            );
        }

        const mentions = Array.from(new Set(dto.content.match(/<@(\d+)>/g))).map((mention) => mention.replace(/<|@|>/g, ""));

        const { chatColor } = await this.prismaService.userSetting.findUnique({
            where: { id: userId },
            select: { chatColor: true }
        });

        return await this.prismaService.$transaction(async (tx) => {
            const message = await tx.message.create({
                data: {
                    author: { connect: { id: userId } },
                    room: { connect: { id: roomId } },
                    content: dto.content,
                    color: chatColor,
                    replyingTo: dto.replyingTo ? { connect: { id: dto.replyingTo } } : undefined,
                    mentions
                },
                include: {
                    replyingTo: {
                        select: {
                            id: true,
                            content: true,
                            authorId: true
                        }
                    }
                }
            });

            await tx.userStatistic.update({
                where: { id: userId },
                data: { messagesSent: { increment: 1 } }
            });

            this.socketService.emitToAll(SocketMessageType.CHAT_MESSAGES_CREATE, { ...message, nonce: dto.nonce });

            return message;
        });
    }

    async startTyping(userId: string, roomId: number): Promise<void> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.id === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        this.socketService.emitToAll(SocketMessageType.CHAT_TYPING_STARTED, { userId, roomId });
    }

    async deleteMessage(userId: string, roomId: number, messageId: string): Promise<void> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.id === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        const message = await this.prismaService.message.findUnique({
            where: {
                id: messageId,
                roomId,
                deletedAt: null
            },
            select: {
                authorId: true
            }
        });

        const isStaffMember = this.permissionsService.hasPermissions((await this.permissionsService.getUserPermissions(userId)), [PermissionType.MANAGE_MESSAGES]);

        if (!message) throw new NotFoundException(NotFound.UNKNOWN_MESSAGE);

        if (
            room.public
            && message.authorId !== userId
            && !isStaffMember
        )
            throw new ForbiddenException(Forbidden.CHAT_MESSAGE_NO_PERMISSION);
        else if (
            message.authorId !== userId
        )
            throw new ForbiddenException(Forbidden.CHAT_MESSAGE_NO_PERMISSION);

        await this.prismaService.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });

        if (room.public) this.socketService.emitToAll(SocketMessageType.CHAT_MESSAGES_DELETE, { messageId });
        else this.socketService.emitToChatRoom(room, SocketMessageType.CHAT_MESSAGES_DELETE, { messageId });
    }

    async editMessage(userId: string, roomId: number, messageId: string, dto: ChatEditMessageDto): Promise<void> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.id === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        const message = await this.prismaService.message.findUnique({
            where: {
                id: messageId,
                roomId,
                deletedAt: null
            }
        });

        if (!message) throw new NotFoundException(NotFound.UNKNOWN_MESSAGE);

        if (message.authorId !== userId) throw new ForbiddenException(Forbidden.CHAT_MESSAGE_NO_PERMISSION);

        await this.prismaService.message.update({
            where: { id: messageId },
            data: {
                content: dto.content,
                editedAt: new Date()
            }
        });

        if (room.public) this.socketService.emitToAll(SocketMessageType.CHAT_MESSAGES_UPDATE, { id: message.id, content: dto.content });
        else this.socketService.emitToChatRoom(room, SocketMessageType.CHAT_MESSAGES_UPDATE, { id: message.id, content: dto.content });
    }
}
