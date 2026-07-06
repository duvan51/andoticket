import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";
import UserSessionLog from "../models/UserSessionLog";

let io: SocketIO;

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId?: number;
  iat: number;
  exp: number;
}

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL
    }
  });


  io.on("connection", socket => {

    let { token } = socket.handshake.query;

    if (Array.isArray(token)) {
      token = token[0];
    }

    let tokenData: TokenPayload | null = null;

    try {
      tokenData = verify(token as string, authConfig.secret) as TokenPayload;
      logger.debug(JSON.stringify(tokenData), "io-onConnection: tokenData");
    } catch (error) {
      logger.error(JSON.stringify(error), "Error decoding token");
    }

    logger.info("Client Connected");
    socket.on("joinChatBox", (ticketId: string) => {
      logger.info("A client joined a ticket channel");
      socket.join(ticketId);
    });

    socket.on("joinNotification", () => {
      if (tokenData && tokenData.companyId) {
        logger.info(`A client joined company ${tokenData.companyId} notification channel`);
        socket.join(`company-${tokenData.companyId}-notification`);
      } else {
        logger.info("A client joined notification channel");
        socket.join("notification");
      }
    });

    socket.on("joinTickets", (status: string) => {
      if (tokenData && tokenData.companyId) {
        logger.info(`A client joined company ${tokenData.companyId} ${status} tickets channel.`);
        socket.join(`company-${tokenData.companyId}-${status}`);
      } else {
        logger.info(`A client joined to ${status} tickets channel.`);
        socket.join(status);
      }
    });

    // Session logic
    let sessionLog: UserSessionLog;
    (async () => {
      if (tokenData && (tokenData as TokenPayload).id) {
        try {
          sessionLog = await UserSessionLog.create({
            userId: Number((tokenData as TokenPayload).id),
            loginAt: new Date()
          });
        } catch (error) {
          logger.error(JSON.stringify(error), "Error creating session log");
        }
      }
    })();

    socket.on("disconnect", async () => {
      logger.info("Client disconnected");
      if (sessionLog) {
        await sessionLog.update({ logoutAt: new Date() });
      }
    });
  });

  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};
