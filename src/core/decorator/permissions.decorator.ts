import { Reflector } from "@nestjs/core";
import { PermissionType } from "@blacket/core";

interface PermissionsObject {
    permissions: PermissionType[];
    message?: string;
}

export const Permissions = Reflector.createDecorator<PermissionsObject>();
