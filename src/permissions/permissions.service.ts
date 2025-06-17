import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RedisService } from "src/redis/redis.service";
import { PermissionType } from "@blacket/core";

@Injectable()
export class PermissionsService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService
    ) { }

    clearCache(userId: string): void {
        this.redisService.deleteKey("userPermissions", userId);
    }

    hasPermission(permissions: PermissionType[], permissionToCheck: PermissionType): boolean {
        return permissions.includes(permissionToCheck);
    }

    hasPermissions(permissions: PermissionType[], permissionsToCheck: PermissionType[]): boolean {
        return permissionsToCheck.every((p) => this.hasPermission(permissions, p));
    }

    async getUserPermissions(userId: string): Promise<PermissionType[]> {
        const cachedPermissions = await this.redisService.getKey("userPermissions", userId);
        if (cachedPermissions) return Object.values(cachedPermissions);

        const user = await this.prismaService.user.findUnique({
            where: {
                id: userId
            },
            include: {
                groups: { include: { group: true } },
                subscriptions: {
                    include: {
                        product: {
                            include: {
                                group: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) return [];

        const groupPermissions = user.groups.reduce((acc, group) => [...acc, ...group.group.permissions], []);
        const subscriptionPermissions = user.subscriptions.reduce((acc, subscription) => {
            if (subscription.product.group) return [...acc, ...subscription.product.group.permissions];

            return acc;
        }, []);

        const permissions = [...new Set([...user.permissions, ...groupPermissions, ...subscriptionPermissions])];

        await this.redisService.setKey("userPermissions", userId, permissions, 3600);

        return permissions;
    }
}
