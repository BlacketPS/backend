import { Controller } from "@nestjs/common";
import { GuildsService } from "./guilds.service";

@Controller("guilds")
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}
}
