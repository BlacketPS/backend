import { Injectable } from "@nestjs/common";
import { RedisService } from "src/redis/redis.service";
import { Server, Socket } from "socket.io";
import { Session } from "src/core/guard";
import { safelyParseJSON } from "src/core/functions";
import { SocketMessageType } from "blacket-types";

@Injectable()
export class SocketService {
    public server: Server;

    constructor(
        private readonly redisService: RedisService
    ) { }

    emitMessageAndCloseSocket(socket: Socket, event: string, data: any) {
        socket.emit(event, data);
        socket.disconnect();
    }

    async verifyConnection(client: Socket) {
        const token = client.handshake.auth.token as string | null;

        if (!token) return this.emitMessageAndCloseSocket(client, SocketMessageType.UNAUTHORIZED, { message: "no token provided" });

        const decodedToken = safelyParseJSON(Buffer.from(token, "base64").toString());
        if (!decodedToken) return this.emitMessageAndCloseSocket(client, SocketMessageType.UNAUTHORIZED, { message: "invalid token" });

        const session = await this.redisService.getSession(decodedToken.userId);
        if (!session) return this.emitMessageAndCloseSocket(client, SocketMessageType.UNAUTHORIZED, { message: "invalid session" });

        if (decodedToken.id !== session.id) return this.emitMessageAndCloseSocket(client, SocketMessageType.UNAUTHORIZED, { message: "token mismatch" });

        client.session = session;

        return client.send(SocketMessageType.AUTHORIZED, { userId: client.session.userId });
    }
}
