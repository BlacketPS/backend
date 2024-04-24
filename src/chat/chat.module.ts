import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { UsersService } from "src/users/users.service";
import { ChatSocketService } from "./chatSocket.service";

@Module({
    controllers: [ChatController],
    providers: [
        ChatService,
        ChatSocketService,
        UsersService
    ],
    exports: [ChatSocketService]
})
export class ChatModule { }
