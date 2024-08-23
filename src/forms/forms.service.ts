import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { FormsCreateDto } from "@blacket/types";
import { hash } from "bcrypt";

@Injectable()
export class FormsService {
    constructor(
        private prismaService: PrismaService,
        private usersService: UsersService
    ) { }

    async getFormById(id: string) {
        return await this.prismaService.form.findUnique({ where: { id } });
    }

    async getFormByUsername(username: string) {
        return await this.prismaService.form.findUnique({ where: { username } });
    }

    async dropFormById(id: string) {
        return await this.prismaService.form.delete({ where: { id } });
    }

    async createForm(dto: FormsCreateDto, ipAddress: string) {
        if (await this.usersService.getUser(dto.username)) return null;

        return await this.prismaService.form.create({
            data: {
                username: dto.username,
                password: await hash(dto.password, 10),
                reasonToPlay: dto.reasonToPlay,
                ipAddress
            }
        });
    }
}
