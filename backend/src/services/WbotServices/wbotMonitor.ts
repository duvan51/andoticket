import * as Sentry from "@sentry/node";
import { Client } from "whatsapp-web.js";

import { getIO } from "../../libs/socket";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import { removeWbot } from "../../libs/wbot";

interface Session extends Client {
  id?: number;
}

const wbotMonitor = async (
  wbot: Session,
  whatsapp: Whatsapp
): Promise<void> => {
  const io = getIO();
  const sessionName = whatsapp.name;

  try {
    wbot.on("change_state", async newState => {
      logger.info(`Monitor session: ${sessionName}, ${newState}`);
      try {
        await whatsapp.update({ status: newState });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(err);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
    });

    wbot.on("change_battery", async batteryInfo => {
      const { battery, plugged } = batteryInfo;
      logger.info(
        `Battery session: ${sessionName} ${battery}% - Charging? ${plugged}`
      );

      try {
        await whatsapp.update({ battery, plugged });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(err);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
    });

    wbot.on("disconnected", async reason => {
      logger.info(`Disconnected session: ${sessionName}, reason: ${reason}`);

      const isLogout = reason === "LOGOUT";
      try {
        await removeWbot(whatsapp.id, isLogout);
      } catch (e) {
        logger.error(`Error cleaning up wbot session on disconnect: ${e}`);
      }

      try {
        if (isLogout) {
          await whatsapp.update({
            status: "DISCONNECTED",
            session: "",
            qrcode: ""
          });
        } else {
          await whatsapp.update({
            status: "OPENING",
            session: ""
          });
          setTimeout(() => StartWhatsAppSession(whatsapp), 3000);
        }
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`Error updating whatsapp status on disconnect: ${err}`);
      }

      io.emit("whatsappSession", {
        action: "update",
        session: whatsapp
      });
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export default wbotMonitor;
