import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("staff")
@Controller("staff")
export class StaffController {}
