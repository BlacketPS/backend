import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumberString, Length, Matches, IsOptional, Validate, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "BenStewart", description: "The username you wish to login with" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly username: string;

    @ApiProperty({ example: "Stewart1995!", description: "The password you wish to use" })
    @IsNotEmpty()
    @Validate((value: string) => value.length > 0)
    readonly password: string;

    @ApiPropertyOptional({ example: "727420", description: "One Time Password code (2FA)" })
    @IsNotEmpty()
    @IsNumberString()
    @Length(6, 6)
    @Matches(/^\d{6}$/, { message: "otpCode must be a 6-digit number with no spaces" })
    @IsOptional()
    readonly otpCode?: string;

    @IsNotEmpty()
    @IsString()
    readonly captchaToken: string;

    constructor(partial: Partial<LoginDto>) {
        Object.assign(this, partial);

        if (this.otpCode) this.otpCode = this.otpCode.replace(/\s/g, "");
    }
}

export default LoginDto;
