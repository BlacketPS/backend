import { Column, Model, Table, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { User } from ".";

export enum OAuthType {
    DISCORD = 1
}

@Table({ tableName: "user_oauth", timestamps: false })
export default class UserOauth extends Model<UserOauth> {
    @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
    declare id: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.STRING, allowNull: false })
    userId: string;

    @BelongsTo(() => User)
    user: User;

    @Column({
        type: DataType.INTEGER,
        validate: { isIn: { args: [Object.values(OAuthType)], msg: `type must be one of these values: ${Object.values(OAuthType).join(", ")}` } },
        allowNull: false
    })
    type: OAuthType;

    @Column({ type: DataType.STRING, allowNull: false })
    tokenType: string;

    @Column({ type: DataType.STRING, allowNull: false })
    accessToken: string;

    @Column({ type: DataType.STRING, allowNull: false })
    refreshToken: string;

    @Column({ type: DataType.STRING, allowNull: false })
    scope: string;

    @Column({ type: DataType.DATE, allowNull: false })
    expiresAt: Date;

    @Column({ type: DataType.DATE, allowNull: false })
    createdAt: Date;
}
