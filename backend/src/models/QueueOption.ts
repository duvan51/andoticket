import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  HasMany,
  DataType
} from "sequelize-typescript";
import Queue from "./Queue";

@Table
class QueueOption extends Model<QueueOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => QueueOption)
  @Column
  parentId: number;

  @BelongsTo(() => QueueOption, { foreignKey: "parentId", onDelete: "CASCADE" })
  parent: QueueOption;

  @HasMany(() => QueueOption, "parentId")
  options: QueueOption[];

  @Column
  option: string;

  @Column
  title: string;

  @Column(DataType.TEXT)
  message: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QueueOption;
