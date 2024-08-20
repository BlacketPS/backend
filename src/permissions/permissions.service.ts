import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { PermissionType, User } from "@prisma/client";

@Injectable()
export class PermissionsService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

    hasPermission(permission: PermissionType[], permissionToCheck: PermissionType): boolean {
        return permission.includes(permissionToCheck);
    }

    hasPermissions(permission: PermissionType[], permissionsToCheck: PermissionType[]): boolean {
        return permissionsToCheck.every((p) => this.hasPermission(permission, p));
    }

    async getUserPermissions(userId: User["id"]): Promise<PermissionType[]> {
        const user = await this.prismaService.user.findUnique({
            where: {
                id: userId
            },
            include: {
                groups: { include: { group: true } }
            }
        });
        if (!user) return [];

        const groupPermissions = user.groups.reduce((acc, group) => [...acc, ...group.group.permissions], []);

        return [...new Set([...user.permissions, ...groupPermissions])];
    }
}
