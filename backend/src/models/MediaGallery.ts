import {
  Table,
  Column,
  DataType,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "MediaGalleries" })
class MediaGallery extends Model<MediaGallery> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  title: string;

  @Column(DataType.TEXT)
  caption: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  mediaUrl: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  mediaType: string;

  @Column(DataType.STRING)
  mimeType: string;

  @Column(DataType.INTEGER)
  size: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MediaGallery;
