import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, Validate } from "class-validator";
import { IsAccessCode } from "src/core/validate";

export class RegisterDto {
    @ApiProperty({ example: "Rin", description: "The username you wish to signup with" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly username: string;

    @ApiProperty({ example: "Tohsaka", description: "The password you wish to use" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly password: string;

    @ApiProperty({ example: "momfater5", description: "A code that's required to signup while the server is in a development mode" })
    @IsNotEmpty()
    @Validate(IsAccessCode)
    readonly accessCode: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsBoolean()
    @Validate((value: boolean) => value === true)
    readonly acceptedTerms: boolean;
}

export default RegisterDto;
