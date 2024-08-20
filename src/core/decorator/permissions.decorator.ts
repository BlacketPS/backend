import { Reflector } from "@nestjs/core";
import { PermissionType } from "@prisma/client";

interface PermissionsObject {
    permissions: PermissionType[];
    message?: string;
}

export const Permissions = Reflector.createDecorator<PermissionsObject>();
