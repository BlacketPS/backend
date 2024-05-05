import { Injectable } from "@nestjs/common";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { UsersService } from "src/users/users.service";
import { Repository } from "sequelize-typescript";
import { hash } from "bcrypt";
import { CreateDto, Form } from "blacket-types";
import { FormStatus } from "blacket-types/dist/models/form.model";

@Injectable()
export class FormsService {
    private formRepo: Repository<Form>;

    constructor(
        private sequelizeService: SequelizeService,
        private usersService: UsersService
    ) {
        this.formRepo = this.sequelizeService.getRepository(Form);
    }

    async getFormById(id: string) {
        return await this.formRepo.findOne({ where: { id } });
    }

    async getFormByUsername(username: string) {
        return await this.formRepo.findOne({ where: { username } });
    }

    async dropFormById(id: string) {
        return await this.formRepo.destroy({ where: { id } });
    }

    async createForm(dto: CreateDto, ipAddress: string) {
        if (await this.usersService.getUser(dto.username)) return null;

        const [
            form,
            created
        ] = await this.formRepo.findOrCreate({ where: { username: dto.username, status: FormStatus.PENDING }, defaults: { password: await hash(dto.password, 10), reasonToPlay: dto.reasonToPlay, ipAddress } });

        return created ? form : null;
    }
}
