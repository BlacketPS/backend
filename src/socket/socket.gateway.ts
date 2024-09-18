import { UseGuards } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "./socket.service";
import { WsAuthGuard } from "src/core/guard";
import { SocketAuctionBidEntity, SocketAuctionExpireEntity, SocketMessageType } from "@blacket/types";

@UseGuards(WsAuthGuard)
@WebSocketGateway(0, {
    path: "/gateway",
    pingInterval: 1000 * 5,
    pingTimeout: 1000 * 10
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly socketService: SocketService,
    ) { }

    @WebSocketServer()
    public server: Server;

    handleConnection(client: Socket) {
        return this.socketService.verifyConnection(client);
    }

    handleDisconnect(client: Socket) {
        if (!client.session.userId) return;

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_LEAVE, { userId: client.session.userId });
    }

    getAllConnectedUsers() {
        return [
            ...new Set(Object.keys(Object.fromEntries(this.server.sockets.adapter.rooms))
                .filter((room) => room.includes("user"))
                .map((room) => room.replace("user-", "")))
        ];
    }

    emitToAll(event: SocketMessageType, data: object) {
        this.server.emit(event, data);
    }

    emitToUser(userId: string, event: SocketMessageType, data: object) {
        this.server.to(userId).emit(event, data);
    }

    emitToUsers(userIds: string[], event: SocketMessageType, data: object) {
        Promise.all(userIds.map((userId) => this.emitToUser(userId, event, data)));
    }

    emitToRoom(room: string, event: SocketMessageType, data: object) {
        this.server.to(room).emit(event, data);
    }

    @SubscribeMessage(SocketMessageType.KEEP_ALIVE)
    handleKeepAlive(client: Socket) {
        client.emit(SocketMessageType.KEEP_ALIVE);
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_JOIN)
    handleTradingPlazaJoin(client: Socket) {
        if (client.rooms.has("trading-plaza")) return;

        console.log("Trading Plaza Join", client.session.userId);

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_JOIN, { userId: client.session.userId });
        client.join("trading-plaza");
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_LEAVE)
    handleTradingPlazaLeave(client: Socket) {
        if (!client.rooms.has("trading-plaza")) return;

        console.log("Trading Plaza Leave", client.session.userId);

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_LEAVE, { userId: client.session.userId });
        client.leave("trading-plaza");
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_MOVE)
    handleTradingPlazaMove(client: Socket, data: any) {
        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_MOVE, { userId: client.session.userId, x: data.x, y: data.y });
    }

    emitAuctionExpireEvent(data: SocketAuctionExpireEntity) {
        this.emitToAll(SocketMessageType.AUCTIONS_EXPIRE, data);
    }

    emitAuctionBidEvent(data: SocketAuctionBidEntity) {
        this.emitToAll(SocketMessageType.AUCTIONS_BID, data);
    }
}
