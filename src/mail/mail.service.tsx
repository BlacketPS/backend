import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import { PrismaService } from "src/prisma/prisma.service";
import { render } from "@react-email/render";
import { TestEmail } from "@blacket/mail-templates";
import { User } from "@blacket/core";

@Injectable()
export class MailService {
    constructor(
        private configService: ConfigService,
        private mailerService: MailerService,
        private prismaService: PrismaService,
    ) { }

    async sendVerificationEmail(to: string, user: User, ipAddress: string) {
        console.log("rendering email");
        const html = await render(<TestEmail userId={user.id} username={user.username} ipAddress={ipAddress} />);
        console.log("rendered email");

        console.log("sending email");
        await this.mailerService.sendMail({
            to,
            subject: "Email Verification",
            html
        });
        console.log("sent email");
    }
}
