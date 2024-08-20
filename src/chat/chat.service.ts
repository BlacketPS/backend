import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { SocketGateway } from "src/socket/socket.gateway";

import { ChatCreateMessageDto, Forbidden, NotFound, SocketMessageType } from "blacket-types";
import { Message, User } from "@prisma/client";

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
            take: limit,
            include: {
                room: true,
                replyingTo: true,
                mentions: true
            },
            omit: {
                replyingToId: true,
                roomId: true
            },
            where: {
                roomId: room
            }
        });
    }

    async createMessage(userId: User["id"], roomId: Message["roomId"], dto: ChatCreateMessageDto): Promise<Message> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        const mentions = Array.from(new Set(dto.content.match(/<@(\d+)>/g))).map((mention) => mention.replace(/<|@|>/g, ""));

        const message = await this.prismaService.message.create({
            data: {
                author: { connect: { id: userId } },
                room: { connect: { id: roomId } },
                content: dto.content,
                replyingTo: dto.replyingTo ? { connect: { id: dto.replyingTo } } : undefined,
                mentions: {
                    connect: mentions.map((mention) => ({ id: mention }))
                }
            },
            include: {
                mentions: true
            }
        });

        this.socketGateway.server.emit(SocketMessageType.CHAT_MESSAGES_CREATE, message);

        return message;
    }

    async startTyping(userId: User["id"], roomId: Message["roomId"]): Promise<void> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        this.socketGateway.server.emit(SocketMessageType.CHAT_TYPING_STARTED, { userId, roomId });
    }
}
