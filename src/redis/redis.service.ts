import { Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { Repository } from "sequelize-typescript";
import { CoreService } from "src/core/core.service";
import { SequelizeService } from "src/sequelize/sequelize.service";
import { ConfigService } from "@nestjs/config";
import { Resource, Session, Room, Blook, Rarity, Pack, Item, Title, Banner, Font, Emoji, ItemShop, Group, Blacklist, IpAddress, UserPunishment } from "blacket-types";

@Injectable()
export class RedisService extends Redis {
    private prefix: string;

    private blacklistRepo: Repository<Blacklist>;
    private sessionRepo: Repository<Session>;
    private resourceRepo: Repository<Resource>;
    private groupRepo: Repository<Group>;
    private ipAddressRepo: Repository<IpAddress>;
    private roomRepo: Repository<Room>;
    private blookRepo: Repository<Blook>;
    private rarityRepo: Repository<Rarity>;
    private packRepo: Repository<Pack>;
    private itemRepo: Repository<Item>;
    private titleRepo: Repository<Title>;
    private bannerRepo: Repository<Banner>;
    private fontRepo: Repository<Font>;
    private emojiRepo: Repository<Emoji>;
    private userPunishmentRepo: Repository<UserPunishment>;

    constructor(
        private coreService: CoreService,
        private sequelizeService: SequelizeService,
        private configService: ConfigService
    ) {
        super({});

        this.prefix = this.configService.get<string>("SERVER_DATABASE_NAME");

        this.blacklistRepo = this.sequelizeService.getRepository(Blacklist);
        this.sessionRepo = this.sequelizeService.getRepository(Session);
        this.resourceRepo = this.sequelizeService.getRepository(Resource);
        this.groupRepo = this.sequelizeService.getRepository(Group);
        this.ipAddressRepo = this.sequelizeService.getRepository(IpAddress);
        this.roomRepo = this.sequelizeService.getRepository(Room);
        this.blookRepo = this.sequelizeService.getRepository(Blook);
        this.rarityRepo = this.sequelizeService.getRepository(Rarity);
        this.packRepo = this.sequelizeService.getRepository(Pack);
        this.itemRepo = this.sequelizeService.getRepository(Item);
        this.titleRepo = this.sequelizeService.getRepository(Title);
        this.bannerRepo = this.sequelizeService.getRepository(Banner);
        this.fontRepo = this.sequelizeService.getRepository(Font);
        this.emojiRepo = this.sequelizeService.getRepository(Emoji);
        this.userPunishmentRepo = this.sequelizeService.getRepository(UserPunishment);
    }

    async onModuleInit() {
        await this.flushall();

        // some of these also set the name, this is so we can get all data just from the name without having to fetch every blook, item, etc
        for (const blacklist of await this.blacklistRepo.findAll({
            include: [
                { model: this.ipAddressRepo, as: "ipAddress" },
                { model: this.userPunishmentRepo, as: "punishment" }
            ]
        })) {
            this.set(`${this.prefix}:blacklist:${blacklist.ipAddress.ipAddress.replaceAll(":", "|")}`, JSON.stringify(blacklist.dataValues));
        }

        for (const session of await this.sessionRepo.findAll()) this.set(`${this.prefix}:session:${session.userId}`, JSON.stringify(session.dataValues));
        for (const resource of await this.resourceRepo.findAll()) this.set(`${this.prefix}:resource:${resource.id}`, JSON.stringify(resource.dataValues));
        for (const group of await this.groupRepo.findAll()) this.set(`${this.prefix}:group:${group.id}`, JSON.stringify(group.dataValues));
        for (const room of await this.roomRepo.findAll()) {
            this.set(`${this.prefix}:room:${room.id}`, JSON.stringify(room.dataValues));
            this.set(`${this.prefix}:room:${room.name.toLowerCase()}`, JSON.stringify(room.dataValues));
        }
        for (const blook of await this.blookRepo.findAll()) {
            this.set(`${this.prefix}:blook:${blook.id}`, JSON.stringify(blook.dataValues));
            this.set(`${this.prefix}:blook:${blook.name.toLowerCase()}`, JSON.stringify(blook.dataValues));
        }
        for (const rarity of await this.rarityRepo.findAll()) {
            this.set(`${this.prefix}:rarity:${rarity.id}`, JSON.stringify(rarity.dataValues));
            this.set(`${this.prefix}:rarity:${rarity.name.toLowerCase()}`, JSON.stringify(rarity.dataValues));
        }
        for (const pack of await this.packRepo.findAll()) {
            this.set(`${this.prefix}:pack:${pack.id}`, JSON.stringify(pack.dataValues));
            this.set(`${this.prefix}:pack:${pack.name.toLowerCase()}`, JSON.stringify(pack.dataValues));
        }
        for (const item of await this.itemRepo.findAll()) {
            this.set(`${this.prefix}:item:${item.id}`, JSON.stringify(item.dataValues));
            this.set(`${this.prefix}:item:${item.name.toLowerCase()}`, JSON.stringify(item.dataValues));
        }
        for (const title of await this.titleRepo.findAll()) {
            this.set(`${this.prefix}:title:${title.id}`, JSON.stringify(title.dataValues));
            this.set(`${this.prefix}:title:${title.name.toLowerCase()}`, JSON.stringify(title.dataValues));
        }
        for (const banner of await this.bannerRepo.findAll()) {
            this.set(`${this.prefix}:banner:${banner.id}`, JSON.stringify(banner.dataValues));
            this.set(`${this.prefix}:banner:${banner.name.toLowerCase()}`, JSON.stringify(banner.dataValues));
        }
        for (const font of await this.fontRepo.findAll()) {
            this.set(`${this.prefix}:font:${font.id}`, JSON.stringify(font.dataValues));
            this.set(`${this.prefix}:font:${font.name.toLowerCase()}`, JSON.stringify(font.dataValues));
        }
        for (const emoji of await this.emojiRepo.findAll()) {
            this.set(`${this.prefix}:emoji:${emoji.id}`, JSON.stringify(emoji.dataValues));
            this.set(`${this.prefix}:emoji:${emoji.name.toLowerCase()}`, JSON.stringify(emoji.dataValues));
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
            await this.set(`${this.prefix}:${key}:${value}`, JSON.stringify({ ...oldData, ...data.dataValues ? data.toJSON() : data }));
            if (data?.name || oldData?.name) await this.set(`${this.prefix}:${key}:${data.name.toLowerCase()}`, JSON.stringify({ ...oldData, ...data.dataValues ? data.toJSON() : data }));
        } else {
            await this.setex(`${this.prefix}:${key}:${value}`, ttl, JSON.stringify({ ...oldData, ...data.dataValues ? data.toJSON() : data }));
            if (data?.name || oldData?.name) await this.setex(`${this.prefix}:${key}:${data.name.toLowerCase()}`, ttl, JSON.stringify({ ...oldData, ...data.dataValues ? data.toJSON() : data }));
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

    getGroup = async (id: number): Promise<Group> => await this.getKey("group", id);
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
}
