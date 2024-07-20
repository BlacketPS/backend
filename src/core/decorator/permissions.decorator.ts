import { Reflector } from "@nestjs/core";
import { PermissionType } from "blacket-types";

interface PermissionsObject {
    permissions: PermissionType[];
    message?: string;
}

export const Permissions = Reflector.createDecorator<PermissionsObject>();
