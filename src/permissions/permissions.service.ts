import { Injectable } from "@nestjs/common";
import { Group, User, UserGroup } from "blacket-types";
import { PrismaService } from "src/prisma/prisma.service";
import { Repository, setScopeOptionsGetters } from "sequelize-typescript";
import { PermissionType } from "@prisma/client";

@Injectable()
export class PermissionsService {
    private userRepo: Repository<User>;
    private userGroupRepo: Repository<UserGroup>;
    private groupRepo: Repository<Group>;

    constructor(
        private readonly prismaService: PrismaService
    ) { }

    hasPermission(permission: number[], permissionToCheck: PermissionType): boolean {
        return permission.includes(permissionToCheck);
    }

    hasPermissions(permission: number[], permissionsToCheck: PermissionType[]): boolean {
        return permissionsToCheck.every((p) => this.hasPermission(permission, p));
    }

    async getUserPermissions(userId: User["id"]): Promise<number[]> {
        const user = await this.userRepo.findByPk(userId, { include: [{ model: this.userGroupRepo, as: "groups", include: [this.groupRepo] }] });
        if (!user) return [];

        const groupPermissions = user.groups.reduce((acc, group) => [...acc, ...group.group.permissions], []);

        return [...new Set([...user.permissions, ...groupPermissions])];
    }
}
