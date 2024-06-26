import { UseGuards } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "./socket.service";
import { WsAuthGuard } from "src/core/guard";

@UseGuards(WsAuthGuard)
@WebSocketGateway(0, {
    path: "/gateway"
})
export class SocketGateway implements OnGatewayConnection {
    constructor(
        private readonly socketService: SocketService,
    ) { }

    @WebSocketServer()
    public server: Server;

    handleConnection(client: Socket) {
        return this.socketService.verifyConnection(client);
    }
}
