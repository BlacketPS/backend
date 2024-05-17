import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ApiTags } from "@nestjs/swagger";
import { GetCurrentUser } from "src/core/decorator";
import { CreateMessageDto } from "blacket-types";

@ApiTags("chat")
@Controller("chat")
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Get("messages/:roomId")
    async getMessages(roomId: number) {
        return await this.chatService.getMessages(roomId);
    }

    @Post("messages/:roomId")
    async createMessage(@GetCurrentUser() userId: string, @Param("roomId") roomId: number, @Body() dto: CreateMessageDto) {
        return await this.chatService.createMessage(userId, roomId, dto);
    }

    @Post("messages/:roomId/start-typing")
    @HttpCode(HttpStatus.NO_CONTENT)
    async startTyping(@GetCurrentUser() userId: string, @Param("roomId") roomId: number) {
        return await this.chatService.startTyping(userId, roomId);
    }
}
