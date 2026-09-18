import fs from "fs";
import path from "path";
import {
  MessageMedia,
  Message as WbotMessage,
  MessageSendOptions
} from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import { convertToOgg } from "../../helpers/ConvertAudio";
import CreateMessageService from "../MessageServices/CreateMessageService";

import formatBody from "../../helpers/Mustache";
import { getJid } from "../../helpers/GetJid";

import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import { logger } from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  quotedMsg?: Message;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  quotedMsg
}: Request): Promise<WbotMessage> => {
  try {
    const wbot = await GetTicketWbot(ticket);
    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    let pathToSend = media.path;
    let isAudio = media.mimetype ? media.mimetype.startsWith("audio/") : false;

    if (!isAudio) {
      const ext = path.extname(media.filename).toLowerCase();
      if ([".mp3", ".ogg", ".wav", ".m4a", ".aac", ".opus", ".wma", ".flac"].includes(ext)) {
        isAudio = true;
      }
    }

    let quotedMsgSerializedId: string | undefined;
    if (quotedMsg) {
      try {
        const wbotMsg = await GetWbotMessage(ticket, quotedMsg.id);
        if (wbotMsg && wbotMsg.id) {
          quotedMsgSerializedId = (wbotMsg.id as any)._serialized || (wbotMsg.id as any).$1 || wbotMsg.id.id;
        }
      } catch (err) {
        logger.warn(`Could not find quoted message on WhatsApp Web: ${err}. Using fallback serializer.`);
      }

      if (!quotedMsgSerializedId) {
        quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
      }
    }

    let mediaOptions: MessageSendOptions = {
      caption: hasBody,
      quotedMessageId: quotedMsgSerializedId,
      // @ts-ignore
      ignoreQuoteErrors: true
    };

    let convertedPath: string | null = null;

    if (isAudio) {
      convertedPath = await convertToOgg(media.path);
      pathToSend = convertedPath;
      
      const isActuallyOgg = convertedPath.toLowerCase().endsWith(".ogg");

      if (isActuallyOgg) {
        mediaOptions.sendAudioAsVoice = true;
      }

      if (convertedPath && convertedPath !== media.path) {
        if (fs.existsSync(media.path)) {
          try {
            fs.unlinkSync(media.path);
          } catch (e) {}
        }
        media.path = convertedPath;
        media.filename = path.basename(convertedPath);
      }
    }

    const newMedia = MessageMedia.fromFilePath(pathToSend);

    if (isAudio) {
      const isActuallyOgg = pathToSend.toLowerCase().endsWith(".ogg");
      if (isActuallyOgg) {
        newMedia.mimetype = "audio/ogg; codecs=opus";
      } else {
        // Si falló la conversión, mantener el mimetype original o uno genérico de audio
        newMedia.mimetype = media.mimetype && media.mimetype.startsWith("audio/") ? media.mimetype : "audio/mp4";
      }
    }

    if (
      newMedia.mimetype.startsWith("image/") &&
      !/^.*\.(jpe?g|png|gif)?$/i.exec(media.filename)
    ) {
      mediaOptions["sendMediaAsDocument"] = true;
    }

    const sentMessage = await wbot.sendMessage(
      ticket.isGroup ? `${ticket.contact.number}@g.us` : getJid(ticket.contact.number),
      newMedia,
      mediaOptions
    );

    await ticket.update({ lastMessage: body || media.filename, lastMessageFromMe: true });

    const getMessageId = (msg: WbotMessage): string => {
      if (typeof msg?.id === "object" && msg.id !== null) {
        return msg.id.id || msg.id._serialized || `media-${Date.now()}`;
      }
      if (typeof msg?.id === "string") {
        return msg.id;
      }
      return `media-${Date.now()}`;
    };

    const msgId = getMessageId(sentMessage);

    const messageData = {
      id: msgId,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      companyId: ticket.companyId,
      body: body || media.filename,
      fromMe: true,
      read: true,
      mediaUrl: media.filename,
      mediaType: isAudio ? "audio" : (newMedia.mimetype ? newMedia.mimetype.split("/")[0] : "document"),
      quotedMsgId: quotedMsg?.id,
      ack: 1
    };

    await CreateMessageService({ messageData });

    return sentMessage;
  } catch (err) {
    console.error("Error in SendWhatsAppMedia:", err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
