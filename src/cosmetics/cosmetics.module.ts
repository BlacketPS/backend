import { Module } from "@nestjs/common";
import { CosmeticsService } from "./cosmetics.service";
import { CosmeticsController } from "./cosmetics.controller";

@Module({
    imports: [],
    providers: [CosmeticsService],
    controllers: [CosmeticsController]
})
export class CosmeticsModule { }
