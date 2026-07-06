import { SendScheduledMessagesService } from "./SendScheduledMessagesService";
import { logger } from "../../utils/logger";

export const StartScheduledMessagesLoop = (): void => {
  logger.info("Scheduled messages loop started");
  setInterval(async () => {
    try {
      await SendScheduledMessagesService();
    } catch (err: any) {
      logger.error(`Error in Scheduled Messages Loop: ${err.message || err}`);
    }
  }, 60000); // Checks every minute
};
