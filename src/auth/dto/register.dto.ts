import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Validate } from "class-validator";

export class RegisterDto {
    @ApiProperty({ example: "BenStewart", description: "The username you wish to register with" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly username: string;

    @ApiProperty({ example: "RinToshaka", description: "The password you wish to use" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly password: string;

    @IsNotEmpty()
    @IsString()
    readonly captchaToken: string;
}

export default RegisterDto;
