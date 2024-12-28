import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ApiTags } from "@nestjs/swagger";
import { GetCurrentUser } from "src/core/decorator";
import { ChatCreateMessageDto, ChatEditMessageDto } from "@blacket/types";
import { seconds, Throttle } from "@nestjs/throttler";

@ApiTags("chat")
@Controller("chat")
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Throttle({ default: { limit: 15, ttl: seconds(5) } })
    @Get("messages/:roomId")
    async getMessages(
        roomId: number
    ) {
        return await this.chatService.getMessages(roomId);
    }

    @Throttle({ default: { limit: 100, ttl: seconds(60) } })
    @Post("messages/:roomId")
    async createMessage(
        @GetCurrentUser() userId: string,
        @Param("roomId", ParseIntPipe) roomId: number,
        @Body() dto: ChatCreateMessageDto
    ) {
        return await this.chatService.createMessage(userId, roomId, dto);
    }

    @Throttle({ default: { limit: 25, ttl: seconds(5) } })
    @Post("messages/:roomId/start-typing")
    @HttpCode(HttpStatus.NO_CONTENT)
    async startTyping(
        @GetCurrentUser() userId: string,
        @Param("roomId", ParseIntPipe) roomId: number
    ) {
        return await this.chatService.startTyping(userId, roomId);
    }

    @Throttle({ default: { limit: 20, ttl: seconds(20) } })
    @Delete("messages/:roomId/:messageId")
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMessage(
        @GetCurrentUser() userId: string,
        @Param("roomId", ParseIntPipe) roomId: number,
        @Param("messageId") messageId: string
    ) {
        return await this.chatService.deleteMessage(userId, roomId, messageId);
    }

    @Throttle({ default: { limit: 5, ttl: seconds(5) } })
    @HttpCode(HttpStatus.NO_CONTENT)
    @Put("messages/:roomId/:messageId")
    async editMessage(
        @GetCurrentUser() userId: string,
        @Param("roomId", ParseIntPipe) roomId: number,
        @Param("messageId") messageId: string,
        @Body() dto: ChatEditMessageDto
    ) {
        return await this.chatService.editMessage(userId, roomId, messageId, dto);
    }
}
