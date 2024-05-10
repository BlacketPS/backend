import { Module, forwardRef } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { UsersService } from "src/users/users.service";
import { SocketModule } from "src/socket/socket.module";

@Module({
    imports: [forwardRef(() => SocketModule)],
    controllers: [ChatController],
    providers: [
        ChatService,
        UsersService
    ]
})
export class ChatModule { }
