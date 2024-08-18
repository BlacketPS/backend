import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { Repository } from "sequelize-typescript";
import { FormsCreateDto, Form, FormStatus } from "blacket-types";
import { hash } from "bcrypt";

@Injectable()
export class FormsService {
    private formRepo: Repository<Form>;

    constructor(
        private sequelizeService: PrismaService,
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

    async createForm(dto: FormsCreateDto, ipAddress: string) {
        if (await this.usersService.getUser(dto.username)) return null;

        const [
            form,
            created
        ] = await this.formRepo.findOrCreate({ where: { username: dto.username, status: FormStatus.PENDING }, defaults: { password: await hash(dto.password, 10), reasonToPlay: dto.reasonToPlay, ipAddress } });

        return created ? form : null;
    }
}
