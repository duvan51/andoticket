import qrCode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";
import { getIO } from "./socket";
import Whatsapp from "../models/Whatsapp";
import Ticket from "../models/Ticket";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import { handleMessage, wbotMessageListener } from "../services/WbotServices/wbotMessageListener";
import wbotMonitor from "../services/WbotServices/wbotMonitor";
import fs from "fs";
import path from "path";

interface Session extends Client {
  id?: number;
}

const sessions: Session[] = [];
const initializingSessions: Map<number, Promise<Session>> = new Map();

const syncUnreadMessages = async (wbot: Session) => {
  try {
    const chats = await wbot.getChats();

    /* eslint-disable no-restricted-syntax */
    /* eslint-disable no-await-in-loop */
    for (const chat of chats) {
      if (chat.unreadCount > 0) {
        const unreadMessages = await chat.fetchMessages({
          limit: chat.unreadCount
        });

        for (const msg of unreadMessages) {
          await handleMessage(msg, wbot);
        }

        await chat.sendSeen();
      }
    }
  } catch (err) {
    logger.error(`syncUnreadMessages error: ${err}`);
  }
};

const removeChromeLocks = (dir: string) => {
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isDirectory()) {
          removeChromeLocks(fullPath);
        } else if (file.startsWith("Singleton") || file.includes("Singleton")) {
          fs.unlinkSync(fullPath);
        }
      } catch (e) {
        if (file.startsWith("Singleton") || file.includes("Singleton")) {
          try {
            fs.unlinkSync(fullPath);
          } catch (err) {}
        }
      }
    }
  } catch (e) {}
};

export const initWbot = async (whatsapp: Whatsapp): Promise<Session> => {
  if (initializingSessions.has(whatsapp.id)) {
    logger.info(`Session bd_${whatsapp.id} is already initializing, returning existing promise.`);
    return initializingSessions.get(whatsapp.id)!;
  }

  const initPromise = new Promise<Session>(async (resolve, reject) => {
    try {
      const existingSessionIndex = sessions.findIndex(s => s.id == whatsapp.id);
      if (existingSessionIndex !== -1) {
        try {
          await sessions[existingSessionIndex].destroy();
        } catch (e) {
          logger.error(`Error destroying previous session instance bd_${whatsapp.id}: ${e}`);
        }
        sessions.splice(existingSessionIndex, 1);
      }

      const sessionDir = path.join(__dirname, "..", "..", ".wwebjs_auth", `session-bd_${whatsapp.id}`);
      removeChromeLocks(sessionDir);

      const io = getIO();
      const sessionName = whatsapp.name;
      let sessionCfg: Record<string, unknown> | undefined;

      if (whatsapp?.session) {
        sessionCfg = JSON.parse(whatsapp.session) as Record<string, unknown>;
      }

      const defaultArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-extensions",
        "--disable-ipc-flooding-protection",
        "--disable-renderer-backgrounding",
        "--force-color-profile=srgb",
        "--mute-audio"
      ];
      const customArgs = (process.env.CHROME_ARGS || "").split(" ").filter(Boolean);
      const combinedArgs = Array.from(new Set([...defaultArgs, ...customArgs]));

      const webVersion = process.env.WEB_VERSION || "2.3000.1046755146-alpha";

      const wbot: Session = new Client({
        session: sessionCfg,
        authStrategy: new LocalAuth({ clientId: "bd_" + whatsapp.id }),
        webVersion,
        webVersionCache: {
          type: "remote",
          remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html",
        },
        puppeteer: {
          executablePath: process.env.CHROME_BIN || undefined,
          // @ts-ignore
          browserWSEndpoint: process.env.CHROME_WS || undefined,
          args: combinedArgs,
          protocolTimeout: 120000
        }
      } as any);

      wbot.id = whatsapp.id;
      const initialSessionIndex = sessions.findIndex(s => s.id == whatsapp.id);
      if (initialSessionIndex === -1) {
        sessions.push(wbot);
      } else {
        sessions[initialSessionIndex] = wbot;
      }

      wbotMessageListener(wbot);
      wbotMonitor(wbot, whatsapp);

      wbot.initialize();

      wbot.on("code", async (code: string) => {
        logger.info(`Session: ${sessionName} PAIRING CODE: ${code}`);
        await whatsapp.update({ qrcode: code, status: "qrcode", retries: 0 });

        const sessionIndex = sessions.findIndex(s => s.id == whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        } else {
          wbot.id = whatsapp.id;
          sessions[sessionIndex] = wbot;
        }

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });
      });

      wbot.on("qr", async qr => {
        logger.info("Session:", sessionName);
        await whatsapp.update({ qrcode: qr, status: "qrcode", retries: 0 });

        const sessionIndex = sessions.findIndex(s => s.id == whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        } else {
          wbot.id = whatsapp.id;
          sessions[sessionIndex] = wbot;
        }

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });
      });

      wbot.on("authenticated", async (session: any) => {
        logger.info(`Session: ${sessionName} AUTHENTICATED`);
        await whatsapp.update({
          status: "CONNECTED",
          qrcode: ""
        });

        const sessionIndex = sessions.findIndex(s => s.id == whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        } else {
          wbot.id = whatsapp.id;
          sessions[sessionIndex] = wbot;
        }

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });
      });

      wbot.on("auth_failure", async msg => {
        logger.error(
          `Session: ${sessionName} AUTHENTICATION FAILURE! Reason: ${msg}`
        );

        if (whatsapp.retries > 1) {
          await whatsapp.update({ session: "", retries: 0 });
        }

        const retry = whatsapp.retries;
        await whatsapp.update({
          status: "DISCONNECTED",
          retries: retry + 1
        });

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        initializingSessions.delete(whatsapp.id);
        reject(new Error("Error starting whatsapp session."));
      });

      wbot.on("ready", async () => {
        logger.info(`Session: ${sessionName} READY`);

        const number = wbot.info.wid.user;

        await whatsapp.update({
          status: "CONNECTED",
          qrcode: "",
          retries: 0,
          number
        });

        const oldWhatsapps = await Whatsapp.findAll({
          where: {
            number,
            companyId: whatsapp.companyId,
            id: {
              [Op.ne]: whatsapp.id
            }
          }
        });

        if (oldWhatsapps.length > 0) {
          const oldWhatsappIds = oldWhatsapps.map(w => w.id);
          await Ticket.update(
            { whatsappId: whatsapp.id },
            {
              where: {
                whatsappId: oldWhatsappIds,
                companyId: whatsapp.companyId
              }
            }
          );
          logger.info(`Moved tickets from old WhatsApp connections (${oldWhatsappIds.join(", ")}) to new WhatsApp connection ${whatsapp.id} for number ${number}`);
        }

        io.emit("whatsappSession", {
          action: "update",
          session: whatsapp
        });

        const sessionIndex = sessions.findIndex(s => s.id == whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        } else {
          wbot.id = whatsapp.id;
          sessions[sessionIndex] = wbot;
        }

        wbot.sendPresenceAvailable();
        try {
          await syncUnreadMessages(wbot);
        } catch (err) {
          logger.error(`Error in syncUnreadMessages call: ${err}`);
        }

        initializingSessions.delete(whatsapp.id);
        resolve(wbot);
      });
    } catch (err) {
      initializingSessions.delete(whatsapp.id);
      logger.error(err);
      reject(err);
    }
  });

  initializingSessions.set(whatsapp.id, initPromise);
  return initPromise;
};

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id == whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const removeWbot = async (
  whatsappId: number,
  clearAuthFiles = true
): Promise<void> => {
  try {
    initializingSessions.delete(whatsappId);
    const sessionIndex = sessions.findIndex(s => s.id == whatsappId);
    if (sessionIndex !== -1) {
      try {
        await sessions[sessionIndex].destroy();
      } catch (e) {
        logger.error(`Error destroying wbot session bd_${whatsappId}: ${e}`);
      }
      sessions.splice(sessionIndex, 1);
    }

    if (clearAuthFiles) {
      const sessionPath = path.resolve(__dirname, "..", "..", ".wwebjs_auth", `session-bd_${whatsappId}`);
      if (fs.existsSync(sessionPath)) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          logger.info(`Session files for bd_${whatsappId} deleted successfully.`);
        } catch (err) {
          logger.error(`Error deleting session directory: ${err}`);
        }
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

export const requestPairingCode = async (
  whatsappId: number,
  phoneNumber: string
): Promise<string> => {
  const sessionIndex = sessions.findIndex(s => s.id == whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  const cleanNumber = phoneNumber.replace(/\D/g, "");
  if (!cleanNumber || cleanNumber.length < 8) {
    throw new AppError("ERR_INVALID_PHONE_NUMBER");
  }

  const wbot = sessions[sessionIndex];
  const code = await wbot.requestPairingCode(cleanNumber);
  return code;
};

