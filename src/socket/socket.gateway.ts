import { UseFilters, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketService } from "./socket.service";
import { WsAuthGuard } from "src/core/guard";
import { WsExceptionFilter } from "src/core/filters";
import { BrenderEntity, BrenderPlayerEntity, SocketAuctionBidEntity, SocketAuctionExpireEntity, SocketMessageType, BrenderTradingTableEntity, SocketTradingPlazaMoveDto } from "@blacket/types";

@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@UseFilters(WsExceptionFilter)
@WebSocketGateway(0, {
    path: "/gateway",
    pingInterval: 1000 * 5,
    pingTimeout: 1000 * 10
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private tradingPlazaEntities: {
        generic: BrenderEntity[]
        player: BrenderPlayerEntity[]
        tradingTable: BrenderTradingTableEntity[]
    };
    private pingTimestamps: Map<string, number>;

    constructor(
        private readonly socketService: SocketService
    ) {
        this.tradingPlazaEntities = {
            generic: [],
            player: [],
            tradingTable: []
        };
        this.pingTimestamps = new Map<string, number>();

        setInterval(() => this.checkInactiveClients(), 1000 * 6);
    }

    @WebSocketServer()
    public server: Server;

    async handleConnection(client: Socket) {
        const verify = await this.socketService.verifyConnection(client);
        if (!verify) return client.disconnect(true);

        this.pingTimestamps.set(client.id, Date.now());

        return verify;
    }

    handleDisconnect(client: Socket) {
        if (!client?.session?.userId) return;

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_LEAVE, { userId: client.session.userId });
        this.tradingPlazaEntities.player = this.tradingPlazaEntities.player.filter((player) => player.id !== client.session.userId);
        this.pingTimestamps.delete(client.id);
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

    emitLagback(client: Socket, x: number, y: number) {
        client.emit(SocketMessageType.LAGBACK, { x, y });
    }

    @SubscribeMessage(SocketMessageType.PING)
    handlePing(client: Socket) {
        const timestamp = Date.now();

        this.pingTimestamps.set(client.id, timestamp);

        client.emit(SocketMessageType.PONG);
    }

    @SubscribeMessage(SocketMessageType.PONG)
    handlePong(client: Socket) {
        const sentTimestamp = this.pingTimestamps.get(client.id);
        if (!sentTimestamp) return;

        client.ping = Date.now() - sentTimestamp;
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_JOIN)
    handleTradingPlazaJoin(client: Socket) {
        if (client.inRoom("trading-plaza")) return;

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_JOIN, { userId: client.session.userId });
        this.tradingPlazaEntities.player.push({
            id: client.session.userId,
            x: 0,
            y: 0,
            sitting: false
        });

        client.join("trading-plaza");
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_LEAVE)
    handleTradingPlazaLeave(client: Socket) {
        if (!client.inRoom("trading-plaza")) return;

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_LEAVE, { userId: client.session.userId });
        this.tradingPlazaEntities.player = this.tradingPlazaEntities.player.filter((player) => player.id !== client.session.userId);

        client.leave("trading-plaza");
    }

    @SubscribeMessage(SocketMessageType.TRADING_PLAZA_MOVE)
    handleTradingPlazaMove(client: Socket, data: SocketTradingPlazaMoveDto) {
        if (!client.inRoom("trading-plaza")) return;

        const player = this.tradingPlazaEntities.player.find((player) => player.id === client.session.userId);
        if (!player) return;

        if (player.x === data.x && player.y === data.y) return;

        const distance = Math.sqrt(Math.pow(data.x - player.x, 2) + Math.pow(data.y - player.y, 2));
        if (distance > (50 + client.ping * .1)) return this.emitLagback(client, player.x, player.y);

        player.x = data.x;
        player.y = data.y;

        this.emitToRoom("trading-plaza", SocketMessageType.TRADING_PLAZA_MOVE, { userId: client.session.userId, x: player.x, y: player.y });
    }

    emitAuctionExpireEvent(data: SocketAuctionExpireEntity) {
        this.emitToAll(SocketMessageType.AUCTIONS_EXPIRE, data);
    }

    emitAuctionBidEvent(data: SocketAuctionBidEntity) {
        this.emitToAll(SocketMessageType.AUCTIONS_BID, data);
    }

    private checkInactiveClients() {
        const now = Date.now();

        this.pingTimestamps.forEach((timestamp, clientId) => {
            if (now - timestamp > 10000) {
                const client = this.server.sockets.sockets.get(clientId);
                if (client) client.disconnect(true);

                this.pingTimestamps.delete(clientId);
            }
        });
    }
}
