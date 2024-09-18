import { Injectable, LoggerService } from "@nestjs/common";

enum Color {
    RED = "\x1b[31m",
    GREEN = "\x1b[32m",
    YELLOW = "\x1b[33m",
    BLUE = "\x1b[34m",
    MAGENTA = "\x1b[35m",
    CYAN = "\x1b[36m",
    WHITE = "\x1b[37m",
    RESET = "\x1b[0m"
}

const colorize = (color: Color, message: string) => `${color}${message}${Color.RESET}`;

@Injectable()
export class BlacketLoggerService implements LoggerService {
    log(message: any, context?: string, prefix: string = "Nest") {
        console.log(`${colorize(Color.GREEN, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(Color.GREEN, "LOG")} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(Color.GREEN, message)}`);
    }

    info(message: any, context?: string, prefix: string = "Nest") {
        console.info(`${colorize(Color.CYAN, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(Color.CYAN, "INFO")} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(Color.CYAN, message)}`);
    }

    warn(message: any, context?: string, prefix: string = "Nest") {
        console.warn(`${colorize(Color.YELLOW, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(Color.YELLOW, "WARN")} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(Color.YELLOW, message)}`);
    }

    error(message: any, trace?: string, context?: string, prefix: string = "Nest") {
        console.error(`${colorize(Color.RED, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(Color.RED, "ERROR")} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(Color.RED, message)}`, trace);
    }

    debug(message: any, context?: string, prefix: string = "Nest") {
        console.log(`${colorize(Color.MAGENTA, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(Color.MAGENTA, "DEBUG")} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(Color.MAGENTA, message)}`);
    }

    verbose(message: any, context?: string, prefix: string = "Nest") {
        console.log(`${colorize(Color.BLUE, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(Color.BLUE, "VERBOSE")} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(Color.BLUE, message)}`);
    }
}
