import { Injectable } from "@nestjs/common";
import { Permission, User, UserGroup, Group } from "blacket-types";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { Repository } from "sequelize-typescript";

@Injectable()
export class PermissionsService {
    private userRepo: Repository<User>;
    private userGroupRepo: Repository<UserGroup>;
    private groupRepo: Repository<Group>;

    private groups: Group[] = [];

    constructor(
        private readonly sequelizeService: SequelizeService
    ) {
        this.userRepo = this.sequelizeService.getRepository(User);
        this.userGroupRepo = this.sequelizeService.getRepository(UserGroup);
        this.groupRepo = this.sequelizeService.getRepository(Group);

        this.groupRepo.findAll().then((groups) => this.groups = groups);
    }

    getPermissionsField(permissions: Permission[]): number {
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
    }

    async getUserPermissions(userId: User["id"]): Promise<number> {
        const user = await this.userRepo.findByPk(userId, {
            include: [{ model: this.userGroupRepo, include: [this.groupRepo] }]
        });

        const permissions = user.groups.reduce((acc, group) => this.combinePermissions(acc, this.groups.find((g) => g.id === group.groupId).permissions), user.permissions);

        return this.combinePermissions(user.permissions, permissions);
    }
}
