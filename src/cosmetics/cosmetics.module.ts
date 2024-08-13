import { Module } from "@nestjs/common";
import { CosmeticsService } from "./cosmetics.service";
import { CosmeticsController } from "./cosmetics.controller";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [UsersModule],
    providers: [CosmeticsService],
    controllers: [CosmeticsController]
})
export class CosmeticsModule { }
