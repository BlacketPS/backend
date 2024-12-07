
import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
    constructor(private readonly maxFileSize: number) {}

    transform(file: Express.Multer.File) {
        if (!file) throw new BadRequestException();

        const fileSize = file.size;

        if (fileSize > this.maxFileSize) throw new BadRequestException("File is too large");

        return file;
    }
}
