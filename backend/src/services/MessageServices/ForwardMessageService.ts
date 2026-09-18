import path from "path";
import fs from "fs";
import { MessageMedia, MessageSendOptions } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { getJid } from "../../helpers/GetJid";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import CreateMessageService from "./CreateMessageService";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface Request {
  messageId: string;
  ticketIds: (number | string)[];
  companyId: number;
}

const ForwardMessageService = async ({
  messageId,
  ticketIds,
  companyId
}: Request): Promise<void> => {
  const sourceMessage = await Message.findByPk(messageId, {
    include: ["ticket", "contact"]
  });

  if (!sourceMessage) {
    throw new AppError("ERR_MESSAGE_NOT_FOUND", 404);
  }

  const rawMediaName = sourceMessage.getDataValue("mediaUrl");

  for (const tId of ticketIds) {
    try {
      const ticket = await ShowTicketService(tId, companyId);
      if (!ticket) continue;

      const wbot = await GetTicketWbot(ticket);
      const targetJid = ticket.isGroup
        ? `${ticket.contact.number}@g.us`
        : getJid(ticket.contact.number);

      let sentMessageId: string = `forward-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      if (rawMediaName) {
        const filePath = path.resolve(__dirname, "..", "..", "..", "public", rawMediaName);
        if (fs.existsSync(filePath)) {
          const media = MessageMedia.fromFilePath(filePath);
          const isAudio =
            sourceMessage.mediaType === "audio" ||
            sourceMessage.mediaType === "ptt" ||
            rawMediaName.endsWith(".mp3") ||
            rawMediaName.endsWith(".ogg");

          const mediaOptions: MessageSendOptions = {
            caption:
              sourceMessage.body && sourceMessage.body !== rawMediaName
                ? sourceMessage.body
                : undefined,
            sendAudioAsVoice: isAudio
          };

          const sentWbotMsg = await wbot.sendMessage(targetJid, media, mediaOptions);
          if (sentWbotMsg && sentWbotMsg.id) {
            sentMessageId = (sentWbotMsg.id as any).id || (sentWbotMsg.id as any)._serialized || sentMessageId;
          }
        }
      } else if (sourceMessage.body) {
        const sentWbotMsg = await wbot.sendMessage(targetJid, sourceMessage.body, {
          linkPreview: false
        });
        if (sentWbotMsg && sentWbotMsg.id) {
          sentMessageId = (sentWbotMsg.id as any).id || (sentWbotMsg.id as any)._serialized || sentMessageId;
        }
      }

      const messageData = {
        id: sentMessageId,
        ticketId: ticket.id,
        contactId: ticket.contactId,
        companyId: ticket.companyId,
        body: sourceMessage.body,
        fromMe: true,
        read: true,
        mediaUrl: rawMediaName || undefined,
        mediaType: sourceMessage.mediaType || (rawMediaName ? "image" : "chat"),
        isForwarded: true,
        forwardingScore: (sourceMessage.forwardingScore || 0) + 1,
        ack: 1
      };

      await CreateMessageService({ messageData });

      await ticket.update({
        lastMessage: sourceMessage.body || rawMediaName || "Mensaje reenviado",
        lastMessageFromMe: true
      });

      const io = getIO();
      const reloadedTicket = await ShowTicketService(ticket.id, companyId);
      io.to(reloadedTicket.status)
        .to(`company-${companyId}-${reloadedTicket.status}`)
        .emit("ticket", {
          action: "update",
          ticket: reloadedTicket
        });
    } catch (err) {
      logger.error(`Error forwarding message ${messageId} to ticket ${tId}: ${err}`);
      console.error(`Error forwarding message ${messageId} to ticket ${tId}:`, err);
    }
  }
};

export default ForwardMessageService;
