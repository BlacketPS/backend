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

enum LogLevel {
    LOG = "log",
    INFO = "info",
    WARN = "warn",
    ERROR = "error"
}

const colorize = (color: Color, message: string) => `${color}${message}${Color.RESET}`;

const logWrapper = (color: Color, message: any, trace?: string, context?: string, prefix: string = "Nest", type: LogLevel = LogLevel.LOG) => {
    const msg = `${colorize(color, `[${prefix}]`)} ${colorize(Color.WHITE, `${new Date().toLocaleString()}`)} ${colorize(color, type.toUpperCase())} ${colorize(Color.YELLOW, `[${context}]`)} ${colorize(color, message)}`;

    switch (type) {
        case LogLevel.LOG:
            console.log(msg);
            break;
        case LogLevel.INFO:
            console.info(msg);
            break;
        case LogLevel.WARN:
            console.warn(msg);
            break;
        case LogLevel.ERROR:
            console.error(msg, trace);
            break;
        default:
            console.log(msg);
            break;
    }
};

@Injectable()
export class BlacketLoggerService implements LoggerService {
    log(message: any, context?: string, prefix: string = "Nest") {
        logWrapper(Color.GREEN, message, undefined, context, prefix, LogLevel.LOG);
    }

    info(message: any, context?: string, prefix: string = "Nest") {
        logWrapper(Color.CYAN, message, undefined, context, prefix, LogLevel.INFO);
    }

    warn(message: any, context?: string, prefix: string = "Nest") {
        logWrapper(Color.YELLOW, message, undefined, context, prefix, LogLevel.WARN);
    }

    error(message: any, trace?: string, context?: string, prefix: string = "Nest") {
        logWrapper(Color.RED, message, trace, context, prefix, LogLevel.ERROR);
    }

    debug(message: any, context?: string, prefix: string = "Nest") {
        logWrapper(Color.MAGENTA, message, undefined, context, prefix, LogLevel.LOG);
    }

    verbose(message: any, context?: string, prefix: string = "Nest") {
        logWrapper(Color.BLUE, message, undefined, context, prefix, LogLevel.LOG);
    }
}
