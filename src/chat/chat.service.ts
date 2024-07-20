import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { RedisService } from "src/redis/redis.service";
import { SocketGateway } from "src/socket/socket.gateway";
import { Repository } from "sequelize-typescript";

import { Message, User, Room, ChatCreateMessageDto, Forbidden, NotFound } from "blacket-types";

@Injectable()
export class ChatService {
    private messageRepo: Repository<Message>;

    constructor(
        private readonly sequelizeService: SequelizeService,
        private readonly redisService: RedisService,
        private readonly socketGateway: SocketGateway
    ) {
        this.messageRepo = this.sequelizeService.getRepository(Message);
    }

    async getMessages(room: Message["roomId"] = 0, limit: number = 50) {
        return await this.messageRepo.findAll({
            order: [
                [
                    "createdAt",
                    "DESC"
                ]
            ],
            limit: limit,
            include: [
                {
                    model: this.messageRepo,
                    as: "replyingTo",
                    attributes: {
                        exclude: [
                            "roomId",
                            "replyingToId"
                        ]
                    }
                }
            ],
            attributes: {
                exclude: [
                    "roomId",
                    "replyingToId"
                ]
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

        const message = await this.messageRepo.create({
            authorId: userId,
            roomId: roomId,
            content: dto.content,
            replyingToId: dto.replyingTo,
            mentions
        });

        this.socketGateway.server.emit("chat-messages-create", message);

        return message;
    }

    async startTyping(userId: User["id"], roomId: Message["roomId"]): Promise<void> {
        const room = await this.redisService.getRoom(roomId);
        if (!room) throw new NotFoundException(NotFound.UNKNOWN_ROOM);

        if (!room.public) throw new ForbiddenException(Forbidden.CHAT_ROOM_NO_PERMISSION);

        this.socketGateway.server.emit("chat-typing-started", { userId, roomId });
    }
}
