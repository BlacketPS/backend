import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { SocketGateway } from "src/socket/socket.gateway";

import { ChatCreateMessageDto, Forbidden, NotFound, SocketMessageType } from "@blacket/types";
import { Message, PunishmentType, User } from "@blacket/core";

@Injectable()
export class ChatService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService,
        private readonly socketGateway: SocketGateway
    ) { }

    async getMessages(room: number = 0, limit: number = 50) {
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
                roomId: room
            }
        });
    }

    async createMessage(userId: string, roomId: number, dto: ChatCreateMessageDto): Promise<Message> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.userId === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);
        else if (room.public) {
            const mute = await this.prismaService.userPunishment.findFirst({
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

        const message = await this.prismaService.message.create({
            data: {
                author: { connect: { id: userId } },
                room: { connect: { id: roomId } },
                content: dto.content,
                replyingTo: dto.replyingTo ? { connect: { id: dto.replyingTo } } : undefined,
                mentions
            }
        });

        this.socketGateway.server.emit(SocketMessageType.CHAT_MESSAGES_CREATE, message);

        return message;
    }

    async startTyping(userId: User["id"], roomId: Message["roomId"]): Promise<void> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public && !room.users.find((user) => user.userId === userId)) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        this.socketGateway.server.emit(SocketMessageType.CHAT_TYPING_STARTED, { userId, roomId });
    }
}
