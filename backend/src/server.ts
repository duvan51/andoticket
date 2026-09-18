import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { StartScheduledMessagesLoop } from "./services/ScheduledMessageServices/StartScheduledMessagesLoop";
import { StartOfflineMessagesLoop } from "./services/WbotServices/StartOfflineMessagesLoop";

process.on("uncaughtException", err => {
  logger.error(`Uncaught Exception: ${err.message}`, err);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

const server = app.listen(process.env.PORT, () => {
  logger.info(`Server started on port: ${process.env.PORT}`);
});

initIO(server);
StartAllWhatsAppsSessions();
StartScheduledMessagesLoop();
StartOfflineMessagesLoop();
gracefulShutdown(server);
