import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, Validate } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "Ben", description: "The username you wish to login with" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly username: string;

    @ApiProperty({ example: "Stewart", description: "The password you wish to use" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly password: string;

    @ApiPropertyOptional({ example: "727420", description: "One Time Password code (2FA)" })
    @IsOptional()
    readonly otpCode?: string;
}

export default LoginDto;
