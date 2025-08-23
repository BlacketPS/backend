import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";

@Module({
    providers: [MailService],
    controllers: [],
    exports: [MailService]
})
export class MailModule { }
