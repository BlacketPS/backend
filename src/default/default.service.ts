import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Config } from "@blacket/types";

@Injectable()
export class DefaultService {
    constructor(
        private readonly configService: ConfigService
    ) { }

    get(): Config {
        return {
            version: this.configService.get("VITE_INFORMATION_VERSION"),
            mode: this.configService.get("SERVER_TYPE")
        };
    }
}
