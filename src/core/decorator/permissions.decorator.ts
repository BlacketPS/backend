import { Reflector } from "@nestjs/core";
import { Permission } from "blacket-types";

export const Permissions = Reflector.createDecorator<Permission[]>();
