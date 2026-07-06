import { Sequelize } from "sequelize-typescript";
import Whatsapp from "./src/models/Whatsapp";
import Queue from "./src/models/Queue";
import WhatsappQueue from "./src/models/WhatsappQueue";
import Company from "./src/models/Company";
import Ticket from "./src/models/Ticket";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize({
    dialect: "mysql",
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    logging: false,
    models: [Whatsapp, Queue, WhatsappQueue, Company, Ticket]
});

async function check() {
    try {
        const [results] = await sequelize.query("DESCRIBE Whatsapps;");
        console.log("Columns in Whatsapps table:");
        console.table(results);
        process.exit(0);
    } catch (err) {
        console.error("Error connecting to DB or describing table:", err.message);
        process.exit(1);
    }
}

check();
