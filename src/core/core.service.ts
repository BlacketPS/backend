import { Injectable } from "@nestjs/common";

@Injectable()
export class CoreService {
    constructor() {}

    safelyParseJSON(json: string): any {
        let parsed: any;
    
        try {
            parsed = JSON.parse(json);
        } catch {
            // womp womp 🤓
        }
    
        return parsed;
    }

    serializeBigInt(obj: any): any {
        if (typeof obj === "bigint") return obj.toString();
        else if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
        else if (typeof obj === "object" && obj !== null) return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, this.serializeBigInt(value)]));
    
        return obj;
    }
}