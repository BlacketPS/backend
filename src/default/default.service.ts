import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DefaultService {
    constructor(
        private readonly configService: ConfigService
    ) { }

    async get() {
        return {
            version: this.configService.get("VITE_INFORMATION_VERSION")
        };
    }
}
