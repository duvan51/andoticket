import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import QuickAnswer from "../models/QuickAnswer";
import Tag from "../models/Tag";
import TicketTag from "../models/TicketTag";
import TicketTracking from "../models/TicketTracking";
import UserSessionLog from "../models/UserSessionLog";
import Company from "../models/Company";
import Plan from "../models/Plan";
import ScheduledMessage from "../models/ScheduledMessage";
import QueueOption from "../models/QueueOption";

// eslint-disable-next-line
const dbConfig = require("../config/database");
// import dbConfig from "../config/database";

const sequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  QuickAnswer,
  Tag,
  TicketTag,
  TicketTracking,
  UserSessionLog,
  Company,
  Plan,
  ScheduledMessage,
  QueueOption
];

sequelize.addModels(models);

export default sequelize;
