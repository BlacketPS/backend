import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsService } from "src/permissions/permissions.service";
import { Permissions } from "../decorator";
import { Permission } from "blacket-types";

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private readonly permissionsService: PermissionsService
    ) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();

        const requiredPermissions = this.reflector.get<Permission[]>(Permissions, context.getHandler());
        if (!requiredPermissions) return true;

        if (!request.session) return false;

        const userId = request.session?.userId;
        if (!userId) return false;

        const permissions = await this.permissionsService.getUserPermissions(userId);
        return this.permissionsService.hasPermissions(permissions, requiredPermissions);
    }
}
