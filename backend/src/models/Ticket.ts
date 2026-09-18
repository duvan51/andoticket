import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default,
  BelongsToMany
} from "sequelize-typescript";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";
import Tag from "./Tag";
import TicketTag from "./TicketTag";
import Company from "./Company";
import TicketTracking from "./TicketTracking";
import QueueOption from "./QueueOption";

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(true)
  @Column
  lastMessageFromMe: boolean;

  @Default(false)
  @Column
  isGroup: boolean;

  @Default(false)
  @Column
  flowStopped: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => QueueOption)
  @Column
  currentOptionId: number;

  @BelongsTo(() => QueueOption)
  currentOption: QueueOption;

  @HasMany(() => Message)
  messages: Message[];

  @BelongsToMany(() => Tag, () => TicketTag)
  tags: Tag[];

  @HasMany(() => TicketTracking)
  trackings: TicketTracking[];
}

export default Ticket;
