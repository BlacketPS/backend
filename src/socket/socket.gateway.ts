import { UseGuards } from "@nestjs/common";
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Server as eiowsServer } from "eiows";
import { SocketService } from "./socket.service";
import { WsAuthGuard } from "src/core/guard";
import { ChatSocketService } from "src/chat/chatSocket.service";

@UseGuards(WsAuthGuard)
@WebSocketGateway(0, {
    path: "/gateway",
    wsEngine: eiowsServer
})
export class SocketGateway implements OnGatewayConnection {
    constructor(
        private readonly socketService: SocketService,
        private chatSocketService: ChatSocketService
    ) { }

    @WebSocketServer()
    public server: Server;

    handleConnection(client: Socket) {
        return this.socketService.verifyConnection(client);
    }

    @SubscribeMessage("test")
    test(socket: Socket, data: string): string {
        return this.chatSocketService.test(socket, data);
    }
}
