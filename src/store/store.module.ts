import { Module } from "@nestjs/common";
import { StoreService } from "./store.service";
import { StoreController } from "./store.controller";
import { Client, Environment } from "square";
import { CoreService } from "src/core/core.service";

const clientProvider = {
    provide: Client,
    useFactory: () => {
        return new Client({
            environment: Environment.Sandbox,
            accessToken: process.env.SERVER_SQUARE_ACCESS_TOKEN
        });
    }
};

@Module({
    providers: [clientProvider, CoreService, StoreService],
    controllers: [StoreController]
})
export class StoreModule { }
