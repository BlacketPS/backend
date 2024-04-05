import { Column, Model, Table, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { Auction, User } from ".";

@Table({ tableName: "auction_bid" })
export default class AuctionBid extends Model<AuctionBid> {
    @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
    declare id: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.STRING, allowNull: false, primaryKey: true })
    userId: string;

    @BelongsTo(() => User)
    user: User;

    @ForeignKey(() => Auction)
    @Column({ type: DataType.INTEGER, allowNull: false, primaryKey: true })
    auctionId: number;

    @BelongsTo(() => Auction)
    auction: Auction;

    @Column({ type: DataType.DOUBLE, allowNull: false })
    amount: number;
}
