import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement,
  AllowNull,
  DataType
} from "sequelize-typescript";

import Ticket from "./Ticket";
import Contact from "./Contact";
import User from "./User";
import Company from "./Company";

@Table
class ScheduledMessage extends Model<ScheduledMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  body: string;

  @Column({
    type: DataType.STRING,
    defaultValue: "message"
  })
  mediaType: string;

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    const rawUrl = this.getDataValue("mediaUrl");
    if (rawUrl) {
      if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        return rawUrl;
      }
      const backendUrl = process.env.BACKEND_URL || "";
      const proxyPort = process.env.PROXY_PORT;
      const isStandardPort = !proxyPort || proxyPort === "443" || proxyPort === "80";
      const hasPort = /:\d+/.test(backendUrl.replace("https://", "").replace("http://", ""));
      const portSuffix = hasPort || isStandardPort ? "" : `:${proxyPort}`;
      return `${backendUrl}${portSuffix}/public/${rawUrl}`;
    }
    return null;
  }

  @Column
  mediaName: string;

  @Column({
    type: DataType.STRING,
    defaultValue: "pending"
  })
  status: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  sendAt: Date;

  @Column(DataType.DATE)
  sentAt: Date;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ScheduledMessage;
