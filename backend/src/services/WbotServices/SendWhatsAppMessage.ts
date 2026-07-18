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
    await GetWbotMessage(ticket, quotedMsg.id);
    quotedMsgSerializedId = SerializeWbotMsgId(ticket, quotedMsg);
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
        linkPreview: false
      }
    );

    await ticket.update({ lastMessage: body, lastMessageFromMe: true });
    return sentMessage;
  } catch (err) {
    logger.error(err, "Error in SendWhatsAppMessage");
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
