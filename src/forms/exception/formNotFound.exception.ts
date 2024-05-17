import { HttpException, HttpStatus } from "@nestjs/common";
import { NotFound } from "blacket-types";

export class FormNotFoundException extends HttpException {
    constructor() {
        super(NotFound.UNKNOWN_FORM, HttpStatus.NOT_FOUND);
    }
}
