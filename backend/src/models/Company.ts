import {
    Table,
    Column,
    CreatedAt,
    UpdatedAt,
    Model,
    PrimaryKey,
    AutoIncrement,
    Default,
    DataType,
    HasMany,
    ForeignKey,
    BelongsTo,
    BeforeCreate,
    BeforeUpdate
} from "sequelize-typescript";
import { hash } from "bcryptjs";
import User from "./User";
import Ticket from "./Ticket";
import Contact from "./Contact";
import Whatsapp from "./Whatsapp";
import Message from "./Message";
import Queue from "./Queue";
import Setting from "./Setting";
import QuickAnswer from "./QuickAnswer";
import Tag from "./Tag";
import Plan from "./Plan";

@Table
class Company extends Model<Company> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    name: string;

    @Column
    email: string;

    @Column
    logo: string;

    @Column(DataType.VIRTUAL)
    password?: string;

    @Column
    passwordHash: string;

    @Default("free")
    @Column
    plan: string;

    @ForeignKey(() => Plan)
    @Column
    planId: number;

    @BelongsTo(() => Plan)
    planData: Plan;

    @Default(true)
    @Column
    status: boolean;

    @Column
    dueDate: Date;

    @CreatedAt
    createdAt: Date;

    @UpdatedAt
    updatedAt: Date;

    @HasMany(() => User)
    users: User[];

    @HasMany(() => Ticket)
    tickets: Ticket[];

    @HasMany(() => Contact)
    contacts: Contact[];

    @HasMany(() => Whatsapp)
    whatsapps: Whatsapp[];

    @HasMany(() => Message)
    messages: Message[];

    @HasMany(() => Queue)
    queues: Queue[];

    @HasMany(() => Setting)
    settings: Setting[];

    @HasMany(() => QuickAnswer)
    quickAnswers: QuickAnswer[];

    @HasMany(() => Tag)
    tags: Tag[];

    @BeforeUpdate
    @BeforeCreate
    static hashPassword = async (instance: Company): Promise<void> => {
        if (instance.password) {
            instance.passwordHash = await hash(instance.password, 8);
        }
    };
}

export default Company;
