import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsService } from "src/permissions/permissions.service";
import { Permissions } from "../decorator";
import { Forbidden, Unauthorized } from "@blacket/types";

@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private readonly permissionsService: PermissionsService
    ) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();

        const requiredPermissions = this.reflector.get(Permissions, context.getHandler());
        if (!requiredPermissions) return true;

        if (!request.session) throw new ForbiddenException(Forbidden.DEFAULT);

        const userId = request.session?.userId;
        if (!userId) throw new UnauthorizedException(Unauthorized.DEFAULT);

        const permissions = await this.permissionsService.getUserPermissions(userId);
        const hasPermissions = this.permissionsService.hasPermissions(permissions, requiredPermissions.permissions);

        if (!hasPermissions) throw new ForbiddenException(requiredPermissions.message ?? Forbidden.DEFAULT);
        else return true;
    }
}
