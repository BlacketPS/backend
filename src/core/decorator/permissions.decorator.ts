import { Reflector } from "@nestjs/core";
import { PermissionType } from "blacket-types";

export const Permissions = Reflector.createDecorator<PermissionType[]>();
