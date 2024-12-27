import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { PermissionType } from "@blacket/core";

@Injectable()
export class PermissionsService {
    constructor(
        private readonly prismaService: PrismaService
    ) { }

    hasPermission(permissions: PermissionType[], permissionToCheck: PermissionType): boolean {
        return permissions.includes(permissionToCheck);
    }

    hasPermissions(permissions: PermissionType[], permissionsToCheck: PermissionType[]): boolean {
        return permissionsToCheck.every((p) => this.hasPermission(permissions, p));
    }

    async getUserPermissions(userId: string): Promise<PermissionType[]> {
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
