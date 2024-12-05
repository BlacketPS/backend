import { UseFilters, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "./socket.service";
import { WsAuthGuard } from "src/core/guard";
import { WsExceptionFilter } from "src/core/filter";
import { SocketMessageType, SocketTradingPlazaMoveDto } from "@blacket/types";

@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@UseFilters(WsExceptionFilter)
@WebSocketGateway(0, {
    path: "/gateway",
    pingInterval: 5000,
    pingTimeout: 20000
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly socketService: SocketService
    ) { }

    afterInit() {
        this.socketService.server = this.server;
    }

    @WebSocketServer()
    public server: Server;

    async handleConnection(client: Socket) {
        const verify = await this.socketService.verifyConnection(client);
        if (!verify) return client.disconnect(true);

        return verify;
    }

    handleDisconnect(client: Socket) {
        if (!client?.session?.userId) return;

        this.socketService.tradingPlazaRemovePlayer(client);
    }

    @SubscribeMessage(SocketMessageType.PING)
    handlePing(client: Socket) {
        client.emit(SocketMessageType.PONG);
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_JOIN)
    handleTradingPlazaJoin(client: Socket) {
        if (client.inRoom("trading-plaza")) return;

        this.socketService.tradingPlazaAddPlayer(client);
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_LEAVE)
    handleTradingPlazaLeave(client: Socket) {
        if (!client.inRoom("trading-plaza")) return;

        this.socketService.tradingPlazaRemovePlayer(client);
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_MOVE)
    handleTradingPlazaMove(client: Socket, data: SocketTradingPlazaMoveDto) {
        if (!client.inRoom("trading-plaza")) return;

        this.socketService.tradingPlazaMovePlayer(client, data);
    }
}
