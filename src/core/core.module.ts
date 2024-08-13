import { Global, Module } from "@nestjs/common";
import { CoreService } from "./core.service";

@Global()
@Module({
    providers: [CoreService],
    exports: [CoreService]
})
export class CoreModule { }
