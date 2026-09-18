import { Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import SerializeWbotMsgId from "../../helpers/SerializeWbotMsgId";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";

import formatBody from "../../helpers/Mustache";
import { getJid } from "../../helpers/GetJid";

import CreateMessageService from "../MessageServices/CreateMessageService";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WbotMessage> => {
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

  const wbot = await GetTicketWbot(ticket);

  let contact: Contact | null = ticket.contact || null;
  if (!contact) {
    contact = await Contact.findByPk(ticket.contactId);
  }

  if (!contact) {
    throw new AppError("ERR_CONTACT_NOT_FOUND");
  }

  try {
    const sentMessage = await wbot.sendMessage(
      ticket.isGroup ? `${contact.number}@g.us` : getJid(contact.number),
      formatBody(body, contact),
      {
        quotedMessageId: quotedMsgSerializedId,
        linkPreview: false,
        // @ts-ignore
        ignoreQuoteErrors: true
      }
    );

    await ticket.update({ lastMessage: body, lastMessageFromMe: true });

    const getMessageId = (msg: WbotMessage): string => {
      if (typeof msg?.id === "object" && msg.id !== null) {
        return msg.id.id || (msg.id as any)._serialized || `chat-${Date.now()}`;
      }
      if (typeof msg?.id === "string") {
        return msg.id;
      }
      return `chat-${Date.now()}`;
    };

    const msgId = getMessageId(sentMessage);

    const messageData = {
      id: msgId,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      companyId: ticket.companyId,
      body: formatBody(body, contact),
      fromMe: true,
      read: true,
      mediaType: "chat",
      quotedMsgId: quotedMsg?.id,
      ack: 1
    };

    await CreateMessageService({ messageData });

    return sentMessage;
  } catch (err) {
    logger.error(err, "Error in SendWhatsAppMessage");
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
