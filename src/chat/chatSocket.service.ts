import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";

@Injectable()
export class ChatSocketService {
    test(socket: Socket, data: string): string {
        console.log("test");
        return data;
    }
}
