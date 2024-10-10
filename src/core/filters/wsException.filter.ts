import { SocketMessageType } from "@blacket/types";
import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";

@Catch(WsException, HttpException)
export class WsExceptionFilter {
    public catch(exception: HttpException, host: ArgumentsHost) {
        const client = host.switchToWs().getClient();

        this.handleError(client, exception);
    }

    public handleError(client: Socket, exception: HttpException | WsException) {
        if (exception instanceof HttpException) {
            const properException = new WsException(exception.getResponse());
            delete properException.message;

            client.emit(SocketMessageType.ERROR, properException);
        } else {
            client.emit(SocketMessageType.ERROR, exception);
        }
    }
}
