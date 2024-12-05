import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Validate } from "class-validator";

export class RegisterDto {
    @ApiProperty({ example: "RinToshaka", description: "The password you wish to use" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly password: string;

    @ApiProperty({ description: "The form ID you wish to register with" })
    @IsNotEmpty()
    readonly formId: string;
}

export default RegisterDto;
