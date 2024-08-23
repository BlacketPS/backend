import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ApiTags } from "@nestjs/swagger";
import { GetCurrentUser } from "src/core/decorator";
import { ChatCreateMessageDto } from "@blacket/types";
import { seconds, Throttle } from "@nestjs/throttler";

@ApiTags("chat")
@Controller("chat")
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Throttle({ default: { limit: 15, ttl: seconds(5) } })
    @Get("messages/:roomId")
    async getMessages(roomId: number) {
        return await this.chatService.getMessages(roomId);
    }

    @Throttle({ default: { limit: 100, ttl: seconds(60) } })
    @Post("messages/:roomId")
    async createMessage(@GetCurrentUser() userId: string, @Param("roomId") roomId: string, @Body() dto: ChatCreateMessageDto) {
        return await this.chatService.createMessage(userId, parseInt(roomId), dto);
    }

    @Throttle({ default: { limit: 25, ttl: seconds(5) } })
    @Post("messages/:roomId/start-typing")
    @HttpCode(HttpStatus.NO_CONTENT)
    async startTyping(@GetCurrentUser() userId: string, @Param("roomId") roomId: number) {
        return await this.chatService.startTyping(userId, roomId);
    }
}
