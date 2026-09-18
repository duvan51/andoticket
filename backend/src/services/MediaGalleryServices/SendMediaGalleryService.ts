import path from "path";
import fs from "fs";
import { MessageMedia, MessageSendOptions } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { getJid } from "../../helpers/GetJid";
import MediaGallery from "../../models/MediaGallery";
import ShowTicketService from "../TicketServices/ShowTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

interface Request {
  ticketId: number | string;
  mediaIds: (number | string)[];
  customCaption?: string;
  companyId: number;
}

const SendMediaGalleryService = async ({
  ticketId,
  mediaIds,
  customCaption,
  companyId
}: Request): Promise<void> => {
  const ticket = await ShowTicketService(ticketId, companyId);
  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const wbot = await GetTicketWbot(ticket);
  const targetJid = ticket.isGroup
    ? `${ticket.contact.number}@g.us`
    : getJid(ticket.contact.number);

  for (const mediaId of mediaIds) {
    const media = await MediaGallery.findOne({
      where: { id: mediaId, companyId }
    });

    if (!media) continue;

    const filePath = path.resolve(__dirname, "..", "..", "..", "public", media.mediaUrl);
    if (!fs.existsSync(filePath)) {
      logger.warn(`Media gallery file not found on disk: ${filePath}`);
      continue;
    }

    const newMedia = MessageMedia.fromFilePath(filePath);
    const isAudio =
      media.mediaType === "audio" ||
      media.mediaUrl.endsWith(".mp3") ||
      media.mediaUrl.endsWith(".ogg");

    const messageCaption =
      customCaption !== undefined && customCaption.trim() !== ""
        ? customCaption
        : media.caption || undefined;

    const mediaOptions: MessageSendOptions = {
      caption: messageCaption,
      sendAudioAsVoice: isAudio
    };

    let sentMsgId = `gallery-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const sentWbotMsg = await wbot.sendMessage(targetJid, newMedia, mediaOptions);
      if (sentWbotMsg && sentWbotMsg.id) {
        sentMsgId = (sentWbotMsg.id as any).id || (sentWbotMsg.id as any)._serialized || sentMsgId;
      }
    } catch (err) {
      logger.error(`Error sending WhatsApp media from gallery: ${err}`);
      console.error("Error sending WhatsApp media from gallery:", err);
    }

    const messageData = {
      id: sentMsgId,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      companyId: ticket.companyId,
      body: messageCaption || media.title || media.mediaUrl,
      fromMe: true,
      read: true,
      mediaUrl: media.mediaUrl,
      mediaType: media.mediaType,
      ack: 1
    };

    await CreateMessageService({ messageData });

    await ticket.update({
      lastMessage: messageCaption || media.title || media.mediaUrl,
      lastMessageFromMe: true
    });
  }

  const io = getIO();
  const reloadedTicket = await ShowTicketService(ticket.id, companyId);
  io.to(reloadedTicket.status)
    .to(`company-${companyId}-${reloadedTicket.status}`)
    .emit("ticket", {
      action: "update",
      ticket: reloadedTicket
    });
};

export default SendMediaGalleryService;
