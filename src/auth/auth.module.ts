import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UsersModule } from "src/users/users.module";
import { FormsService } from "src/forms/forms.service";

@Module({
    imports: [UsersModule],
    providers: [AuthService, FormsService],
    controllers: [AuthController],
    exports: [AuthService]
})
export class AuthModule { }
