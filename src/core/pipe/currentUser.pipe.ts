import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

@Injectable()
export class CurrentUserPipe implements PipeTransform {
    constructor(
        private usersService: UsersService
    ) { }

    async transform(value: any, metadata: ArgumentMetadata) {
        // return this.sequelizeService.getRepository(User).findOne({ where: { id: value } });
        return this.usersService.getUser(value);
    }
}
