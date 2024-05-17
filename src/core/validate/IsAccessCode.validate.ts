import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BadRequest } from "blacket-types";
import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: "IsAccessCode", async: false })
@Injectable()
export class IsAccessCode implements ValidatorConstraintInterface {
    constructor(protected readonly configService: ConfigService) { }

    async validate(text: string) {
        return text && text === this.configService.get<string>("SERVER_ACCESS_CODE");
    }

    defaultMessage() {
        return BadRequest.AUTH_INCORRECT_ACCESS_CODE;
    }
}
