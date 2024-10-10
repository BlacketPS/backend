import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UsersService } from "src/users/users.service";
import { FormsCreateDto, FormStatusEnum, FormsUpdateDto } from "@blacket/types";

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

    async formExists(username: string, ipAddress: string) {
        const count1 = await this.prismaService.form.count({ where: { username: { equals: username, mode: "insensitive" } } });
        const count2 = await this.prismaService.form.count({ where: { ipAddress } });

        return count1 + count2 > 0;
    }

    async dropFormById(id: string) {
        return await this.prismaService.form.delete({ where: { id } });
    }

    async createForm(dto: FormsCreateDto, ipAddress: string) {
        return await this.prismaService.$transaction(async (prisma) => {
            const formExists = await this.formExists(dto.username, ipAddress);
            if (formExists) return null;

            const user = await this.usersService.userExists(dto.username);
            if (user) return null;

            return await prisma.form.create({ data: { username: dto.username, reasonToPlay: dto.reasonToPlay, ipAddress } });
        });
    }

    async updateForm(id: string, dto: FormsUpdateDto) {
        return await this.prismaService.$transaction(async (prisma) => {
            const form = await this.getFormById(id);
            if (!form) return null;

            return await prisma.form.update({
                where: { id },
                data: {
                    reasonToPlay: dto.reasonToPlay,
                    status: FormStatusEnum.PENDING
                }
            });
        });
    }
}
