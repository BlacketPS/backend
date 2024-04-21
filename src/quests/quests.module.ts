import { Module } from "@nestjs/common";
import { QuestsService } from "./quests.service";
import { QuestsController } from "./quests.controller";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [UsersModule],
    controllers: [QuestsController],
    providers: [QuestsService]
})
export class QuestsModule { }
