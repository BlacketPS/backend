import { Injectable } from "@nestjs/common";
import { Group, PermissionType, User, UserGroup } from "blacket-types";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { Repository, setScopeOptionsGetters } from "sequelize-typescript";

@Injectable()
export class PermissionsService {
    private userRepo: Repository<User>;
    private userGroupRepo: Repository<UserGroup>;
    private groupRepo: Repository<Group>;

    constructor(
        private readonly sequelizeService: SequelizeService
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userGroupRepo = this.sequelizeService.getRepository(UserGroup);
        this.groupRepo = this.sequelizeService.getRepository(Group);
    }

    /* getPermissionsField(permissions: Permission[]): number {
        return this.addPermissions(0, permissions);
    }

    addPermission(permission: number, permissionToAdd: Permission): number {
        return permission | permissionToAdd;
    }

    addPermissions(permission: number, permissionsToAdd: Permission[]): number {
        return permissionsToAdd.reduce((acc, p) => acc | p, permission);
    }

    combinePermissions(permissionOne: number, permissionTwo: number): number {
        return permissionOne | permissionTwo;
    }

    removePermission(permission: number, permissionToRemove: Permission): number {
        return permission & ~permissionToRemove;
    }

    removePermissions(permission: number, permissionsToRemove: Permission[]): number {
        return permissionsToRemove.reduce((acc, p) => acc & ~p, permission);
    }

    hasPermission(permission: number, permissionToCheck: Permission): boolean {
        return (permission & permissionToCheck) === permissionToCheck;
    }

    hasPermissions(permission: number, permissionsToCheck: Permission[]): boolean {
        return permissionsToCheck.every((p) => this.hasPermission(permission, p));
    } */

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
