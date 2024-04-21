import { Column, Model, Table, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import { User } from ".";

import { randomUUID } from "node:crypto";

// TODO: separate enums like this into an enum folder on models
export enum FormStatus {
    PENDING = 1,
    ACCEPTED = 2,
    DENIED = 3
};

@Table({ tableName: "form" })
export default class Form extends Model<Form> {
    @Column({ type: DataType.STRING, primaryKey: true, defaultValue: () => randomUUID() })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false })
    username: string;

    @Column({ type: DataType.STRING, allowNull: false })
    password: string;

    @Column({ type: DataType.STRING, allowNull: false })
    ipAddress: string;

    @Column({ type: DataType.STRING, allowNull: false })
    reasonToPlay: string;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: FormStatus.PENDING })
    status: FormStatus;

    @Column({ type: DataType.STRING, allowNull: true })
    deniedReason: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.STRING, allowNull: true })
    accepterId: string;

    @BelongsTo(() => User, "accepterId")
    accepter: User;
}
