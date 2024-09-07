import { Global, Module } from "@nestjs/common";
import { BlacketLoggerService } from "./logger.service";

@Global()
@Module({
    providers: [BlacketLoggerService],
    exports: [BlacketLoggerService]
})
export class LoggerModule {}
