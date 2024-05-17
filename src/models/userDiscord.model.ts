import { Column, Model, Table, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { User } from ".";

@Table({ tableName: "user_discord", timestamps: false })
export default class UserDiscord extends Model<UserDiscord> {
    @Column({ type: DataType.STRING, primaryKey: true })
    declare discordId: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.STRING, allowNull: false })
    userId: string;

    @BelongsTo(() => User)
    user: User;

    @Column({ type: DataType.STRING, allowNull: false })
    username: string;

    @Column({ type: DataType.STRING, allowNull: false })
    discriminator: string;

    @Column({ type: DataType.STRING, allowNull: true })
    global_name?: string;

    @Column({ type: DataType.STRING, allowNull: true })
    avatar?: string;

    @Column({ type: DataType.BOOLEAN, allowNull: true })
    mfa_enabled?: boolean;

    @Column({ type: DataType.STRING, allowNull: true })
    banner?: string;

    @Column({ type: DataType.INTEGER, allowNull: true })
    accent_color?: number;

    @Column({ type: DataType.STRING, allowNull: true })
    locale?: string;

    @Column({ type: DataType.INTEGER, allowNull: true })
    flags?: number;

    @Column({ type: DataType.INTEGER, allowNull: true })
    premium_type?: number;

    @Column({ type: DataType.INTEGER, allowNull: true })
    public_flags?: number;

    @Column({ type: DataType.STRING, allowNull: true })
    avatar_decoration?: string;
}
