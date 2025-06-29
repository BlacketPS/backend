import { Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { CoreService } from "src/core/core.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { Session, Resource, Group, Blook, Rarity, Pack, Item, Title, Banner, Font, Emoji, ItemShop, Prisma } from "@blacket/core";
import { StripeProductEntity } from "@blacket/types";

type Room = Prisma.RoomGetPayload<{ include: { users: { select: { id: true } } } }>;
type Blacklist = Prisma.BlacklistGetPayload<{ include: { ipAddress: true, punishment: true } }>;

@Injectable()
export class RedisService extends Redis {
    private prefix: string;
    constructor(
        private readonly coreService: CoreService,
        private readonly prismaService: PrismaService,
        private readonly configService: ConfigService
    ) {
        super({});

        this.prefix = this.configService.get<string>("SERVER_DATABASE_NAME");
    }

    async onModuleInit() {
        for (const key of await this.keys(`${this.prefix}:*`)) await this.del(key);

        // some of these also set the name, this is so we can get all data just from the name without having to fetch every blook, item, etc
        for (const blacklist of await this.prismaService.blacklist.findMany({
            include: {
                ipAddress: true,
                punishment: true
            }
        })) {
            this.set(`${this.prefix}:blacklist:${blacklist.ipAddress.ipAddress.replaceAll(":", "|")}`, JSON.stringify(blacklist));
        }

        for (const session of await this.prismaService.session.findMany()) this.set(`${this.prefix}:session:${session.userId}`, JSON.stringify(session));
        for (const resource of await this.prismaService.resource.findMany()) this.set(`${this.prefix}:resource:${resource.id}`, JSON.stringify(resource));

        for (const group of await this.prismaService.group.findMany()) this.set(`${this.prefix}:group:${group.id}`, JSON.stringify(group));

        for (const room of await this.prismaService.room.findMany({ include: { users: { select: { id: true } } } })) {
            this.set(`${this.prefix}:room:${room.id}`, JSON.stringify(room));
            this.set(`${this.prefix}:room:${room.name.toLowerCase()}`, JSON.stringify(room));
        }

        for (const blook of await this.prismaService.blook.findMany()) {
            this.set(`${this.prefix}:blook:${blook.id}`, JSON.stringify(blook));
            this.set(`${this.prefix}:blook:${blook.name.toLowerCase()}`, JSON.stringify(blook));
        }

        for (const rarity of await this.prismaService.rarity.findMany()) {
            this.set(`${this.prefix}:rarity:${rarity.id}`, JSON.stringify(rarity));
            this.set(`${this.prefix}:rarity:${rarity.name.toLowerCase()}`, JSON.stringify(rarity));
        }

        for (const pack of await this.prismaService.pack.findMany()) {
            this.set(`${this.prefix}:pack:${pack.id}`, JSON.stringify(pack));
            this.set(`${this.prefix}:pack:${pack.name.toLowerCase()}`, JSON.stringify(pack));
        }

        for (const item of await this.prismaService.item.findMany()) {
            this.set(`${this.prefix}:item:${item.id}`, JSON.stringify(item));
            this.set(`${this.prefix}:item:${item.name.toLowerCase()}`, JSON.stringify(item));
        }

        for (const itemShop of await this.prismaService.itemShop.findMany()) {
            this.set(`${this.prefix}:itemShop:${itemShop.id}`, JSON.stringify(itemShop));
        }

        for (const title of await this.prismaService.title.findMany()) {
            this.set(`${this.prefix}:title:${title.id}`, JSON.stringify(title));
            this.set(`${this.prefix}:title:${title.name.toLowerCase()}`, JSON.stringify(title));
        }

        for (const banner of await this.prismaService.banner.findMany()) {
            this.set(`${this.prefix}:banner:${banner.id}`, JSON.stringify(banner));
            this.set(`${this.prefix}:banner:${banner.name.toLowerCase()}`, JSON.stringify(banner));
        }

        for (const font of await this.prismaService.font.findMany()) {
            this.set(`${this.prefix}:font:${font.id}`, JSON.stringify(font));
            this.set(`${this.prefix}:font:${font.name.toLowerCase()}`, JSON.stringify(font));
        }

        for (const emoji of await this.prismaService.emoji.findMany()) {
            this.set(`${this.prefix}:emoji:${emoji.id}`, JSON.stringify(emoji));
            this.set(`${this.prefix}:emoji:${emoji.name.toLowerCase()}`, JSON.stringify(emoji));
        }

        for (const product of await this.prismaService.product.findMany()) {
            this.set(`${this.prefix}:product:${product.id}`, JSON.stringify(product));
        }

        for (const spinnyWheel of await this.prismaService.spinnyWheel.findMany(
            {
                include: {
                    rewards: true
                }
            }
        )) {
            this.set(`${this.prefix}:spinnyWheel:${spinnyWheel.id}`, JSON.stringify(spinnyWheel));
        }
    }

    // these are CRUCIAL for the redis service to work, all "getters", "setters", and "deleters" will use this
    async getAllFromKey(key: string) {
        const keys = await this.keys(`${this.prefix}:${key}:*`);

        let data = keys.length ? await this.mget(keys) : [];
        data = data.filter((item, index) => data.indexOf(item) === index);

        return data.map((item: string) => this.coreService.safelyParseJSON(item));
    }

    async getKey<T>(key: string, value: any): Promise<T | any> {
        return this.coreService.safelyParseJSON(await this.get(`${this.prefix}:${key}:${value}`));
    }

    async setKey(key: string, value: any, data: any, ttl?: number) {
        const oldData = await this.getKey(key, value);

        if (!ttl) {
            await this.set(`${this.prefix}:${key}:${value}`, JSON.stringify({ ...oldData, ...data }));
            if (data?.name || oldData?.name) await this.set(`${this.prefix}:${key}:${data.name.toLowerCase()}`, JSON.stringify({ ...oldData, ...data }));
        } else {
            await this.setex(`${this.prefix}:${key}:${value}`, ttl, JSON.stringify({ ...oldData, ...data }));
            if (data?.name || oldData?.name) await this.setex(`${this.prefix}:${key}:${data.name.toLowerCase()}`, ttl, JSON.stringify({ ...oldData, ...data }));
        }
    }

    async deleteKey(key: string, value: any) {
        const data = await this.getKey(key, value);
        if (!data) return;

        await this.del(`${this.prefix}:${key}:${data.id}`);
        if (data?.name) await this.del(`${this.prefix}:${key}:${data.name.toLowerCase()}`);
    }

    // start of "getters", "setters", and "deleters"
    // lambda format for smaller code size

    getBlacklist = async (ipAddress: string): Promise<Blacklist> => await this.getKey("blacklist", ipAddress.replaceAll(":", "|"));
    setBlacklist = async (ipAddress: string, blacklist: Partial<Blacklist>): Promise<void> => await this.setKey("blacklist", ipAddress.replaceAll(":", "|"), blacklist);
    deleteBlacklist = async (ipAddress: string): Promise<void> => await this.deleteKey("blacklist", ipAddress.replaceAll(":", "|"));

    getSession = async (userId: string): Promise<Session> => await this.getKey("session", userId);
    setSession = async (userId: string, session: Partial<Session>): Promise<void> => await this.setKey("session", userId, session);
    deleteSession = async (userId: string): Promise<void> => await this.deleteKey("session", userId);

    getResource = async (id: number): Promise<Resource> => await this.getKey("resource", id);
    setResource = async (id: number, resource: Partial<Resource>): Promise<void> => await this.setKey("resource", id, resource);
    deleteResource = async (id: number): Promise<void> => await this.deleteKey("resource", id);

    getGroup = async (id: number): Promise<Room> => await this.getKey("group", id);
    setGroup = async (id: number, group: Partial<Group>): Promise<void> => await this.setKey("group", id, group);
    deleteGroup = async (id: number): Promise<void> => await this.deleteKey("group", id);

    getRoom = async (id: number): Promise<Room> => await this.getKey("room", id);
    setRoom = async (id: number, room: Partial<Room>): Promise<void> => await this.setKey("room", id, room);
    deleteRoom = async (id: number): Promise<void> => await this.deleteKey("room", id);

    getBlook = async (blook: string | number): Promise<Blook> => await this.getKey("blook", blook);
    setBlook = async (id: number, blook: Partial<Blook>): Promise<void> => await this.setKey("blook", id, blook);
    deleteBlook = async (id: number): Promise<void> => await this.deleteKey("blook", id);

    getRarity = async (id: number): Promise<Rarity> => await this.getKey("rarity", id);
    setRarity = async (id: number, rarity: Partial<Rarity>): Promise<void> => await this.setKey("rarity", id, rarity);
    deleteRarity = async (id: number): Promise<void> => await this.deleteKey("rarity", id);

    getPack = async (id: number): Promise<Pack> => await this.getKey("pack", id);
    setPack = async (id: number, pack: Partial<Pack>): Promise<void> => await this.setKey("pack", id, pack);
    deletePack = async (id: number): Promise<void> => await this.deleteKey("pack", id);

    getItem = async (id: number): Promise<Item> => await this.getKey("item", id);
    setItem = async (id: number, item: Partial<Item>): Promise<void> => await this.setKey("item", id, item);
    deleteItem = async (id: number): Promise<void> => await this.deleteKey("item", id);

    getItemShopItem = async (id: number): Promise<ItemShop> => await this.getKey("itemShop", id);
    setItemShopItem = async (id: number, item: Partial<ItemShop>): Promise<void> => await this.setKey("itemShop", id, item);
    deleteItemShopItem = async (id: number): Promise<void> => await this.deleteKey("itemShop", id);

    getTitle = async (id: number): Promise<Title> => await this.getKey("title", id);
    setTitle = async (id: number, title: Partial<Item>): Promise<void> => await this.setKey("title", id, title);
    deleteTitle = async (id: number): Promise<void> => await this.deleteKey("title", id);

    getBanner = async (id: number): Promise<Banner> => await this.getKey("banner", id);
    setBanner = async (id: number, banner: Partial<Banner>): Promise<void> => await this.setKey("banner", id, banner);
    deleteBanner = async (id: number): Promise<void> => await this.deleteKey("banner", id);

    getFont = async (id: number): Promise<Font> => await this.getKey("font", id);
    setFont = async (id: number, font: Partial<Font>): Promise<void> => await this.setKey("font", id, font);
    deleteFont = async (id: number): Promise<void> => await this.deleteKey("font", id);

    getEmoji = async (id: number): Promise<Emoji> => await this.getKey("emoji", id);
    setEmoji = async (id: number, emoji: Partial<Emoji>): Promise<void> => await this.setKey("emoji", id, emoji);
    deleteEmoji = async (id: number): Promise<void> => await this.deleteKey("emoji", id);

    getProduct = async (id: number): Promise<StripeProductEntity> => await this.getKey("product", id);
    setProduct = async (id: number, product: Partial<StripeProductEntity>): Promise<void> => await this.setKey("product", id, product);
    deleteProduct = async (id: number): Promise<void> => await this.deleteKey("product", id);
}
