import { Request, Response } from "express";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import User from "../models/User";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Setting from "../models/Setting";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import CreateMessageService from "../services/MessageServices/CreateMessageService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ForwardMessageService from "../services/MessageServices/ForwardMessageService";
import { logger } from "../utils/logger";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    userId: req.user.id
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg, isNote }: MessageData & { isNote?: boolean } = req.body;
  const medias = req.files as Express.Multer.File[];

  const ticket = await ShowTicketService(ticketId);

  SetTicketMessagesAsRead(ticket);

  if (ticket.contact.number.startsWith("user_group_")) {
    const { companyId } = ticket;
    const currentUserId = req.user.id;

    const senderUser = await User.findByPk(currentUserId);
    const senderContactNumber = `user_${currentUserId}`;
    let [senderContact] = await Contact.findOrCreate({
      where: { number: senderContactNumber, companyId },
      defaults: { name: senderUser?.name || "User", number: senderContactNumber, companyId }
    });

    if (senderUser && senderContact.name !== senderUser.name) {
      await senderContact.update({ name: senderUser.name });
    }

    const randomId = Math.random().toString(36).substring(2, 15);
    const msgId = `internal-group-${randomId}`;

    const message = await CreateMessageService({
      messageData: {
        id: msgId,
        ticketId: ticket.id,
        contactId: senderContact.id,
        body,
        fromMe: false,
        read: true,
        mediaType: "chat"
      }
    });

    await ticket.update({
      lastMessage: body,
      lastMessageFromMe: false
    });

    const io = getIO();
    io.to(ticket.status)
      .to(`company-${companyId}-${ticket.status}`)
      .emit("ticket", {
        action: "update",
        ticket
      });

    return res.status(200).json(message);
  }

  if (ticket.contact.number.startsWith("user_")) {
    const targetUserId = parseInt(ticket.contact.number.replace("user_", ""), 10);
    const { companyId } = ticket;
    const currentUserId = req.user.id;

    const randomId = Math.random().toString(36).substring(2, 15);
    const msgId = `internal-${randomId}`;

    const senderMessage = await CreateMessageService({
      messageData: {
        id: msgId,
        ticketId: ticket.id,
        contactId: ticket.contactId,
        body,
        fromMe: true,
        read: true,
        mediaType: "chat",
        ack: 1
      }
    });

    await ticket.update({
      lastMessage: body,
      lastMessageFromMe: true
    });

    const reloadedSenderTicket = await ShowTicketService(ticket.id, companyId);

    const io = getIO();
    io.to(reloadedSenderTicket.status)
      .to(`company-${companyId}-${reloadedSenderTicket.status}`)
      .emit("ticket", {
        action: "update",
        ticket: reloadedSenderTicket
      });

    const senderUser = await User.findByPk(currentUserId);
    const senderContactNumber = `user_${currentUserId}`;
    let [senderContact] = await Contact.findOrCreate({
      where: { number: senderContactNumber, companyId },
      defaults: { name: senderUser?.name || "User", number: senderContactNumber, companyId }
    });

    if (senderUser && senderContact.name !== senderUser.name) {
      await senderContact.update({ name: senderUser.name });
    }

    let [receiverTicket] = await Ticket.findOrCreate({
      where: {
        contactId: senderContact.id,
        userId: targetUserId,
        companyId
      },
      defaults: {
        contactId: senderContact.id,
        userId: targetUserId,
        companyId,
        status: "open",
        unreadMessages: 0
      }
    });

    await receiverTicket.update({
      lastMessage: body,
      lastMessageFromMe: false,
      unreadMessages: receiverTicket.unreadMessages + 1
    });

    await CreateMessageService({
      messageData: {
        id: `${msgId}-rec`,
        ticketId: receiverTicket.id,
        contactId: senderContact.id,
        body,
        fromMe: false,
        read: false,
        mediaType: "chat"
      }
    });

    const reloadedReceiverTicket = await ShowTicketService(receiverTicket.id, companyId);

    io.to(reloadedReceiverTicket.status)
      .to(`company-${companyId}-${reloadedReceiverTicket.status}`)
      .emit("ticket", {
        action: "update",
        ticket: reloadedReceiverTicket
      });

    return res.status(200).json(senderMessage);
  }

  if (isNote) {
    const randomId = Math.random().toString(36).substring(2, 15);
    const msgId = `note-${randomId}`;

    const message = await Message.create({
      id: msgId,
      ticketId: Number(ticketId),
      contactId: ticket.contactId,
      body,
      fromMe: true,
      read: true,
      mediaType: "note",
      companyId: ticket.companyId
    });

    const io = getIO();
    io.to(ticketId.toString())
      .to(`company-${ticket.companyId}-open`)
      .to(`company-${ticket.companyId}-notification`)
      .emit("appMessage", {
        action: "create",
        message
      });

    return res.status(200).json(message);
  }

  try {
    let parsedQuotedMsg = quotedMsg;
    if (typeof quotedMsg === "string") {
      try {
        parsedQuotedMsg = JSON.parse(quotedMsg);
      } catch (e) {}
    }

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await SendWhatsAppMedia({ media, ticket, body, quotedMsg: parsedQuotedMsg });
        })
      );
    } else {
      await SendWhatsAppMessage({ body, ticket, quotedMsg: parsedQuotedMsg });
    }

    if (!ticket.flowStopped) {
      const autoStopSetting = await Setting.findOne({
        where: { key: "botAutoStopOnReply", companyId: ticket.companyId }
      });
      const isAutoStopEnabled = !autoStopSetting || autoStopSetting.value !== "disabled";

      if (isAutoStopEnabled) {
        const updateData: any = {
          flowStopped: true,
          currentOptionId: null as any
        };
        if (ticket.status === "pending") {
          updateData.status = "open";
          updateData.userId = req.user.id;
        }
        await ticket.update(updateData);
        await ticket.reload();

        const io = getIO();
        io.to(ticket.status)
          .to("notification")
          .to(ticket.id.toString())
          .to(`company-${ticket.companyId}-${ticket.status}`)
          .to(`company-${ticket.companyId}-notification`)
          .emit("ticket", {
            action: "update",
            ticket
          });
      }
    }
  } catch (err) {
    logger.error(`Error sending message/media in MessageController: ${err}`);
    console.error("Error sending message/media in MessageController:", err);
    const randomId = Math.random().toString(36).substring(2, 15);
    const msgId = `offline-${randomId}`;

    const offlineMessage = await Message.create({
      id: msgId,
      ticketId: Number(ticketId),
      contactId: ticket.contactId,
      body: body || "Archivo multimedia (Pendiente de envío)",
      fromMe: true,
      read: true,
      mediaType: medias ? "image" : "chat",
      ack: -1,
      companyId: ticket.companyId
    });

    await ticket.update({
      lastMessage: body || "Archivo multimedia (Pendiente de envío)",
      lastMessageFromMe: true
    });

    const io = getIO();
    io.to(ticketId.toString())
      .to(`company-${ticket.companyId}-open`)
      .to(`company-${ticket.companyId}-notification`)
      .emit("appMessage", {
        action: "create",
        message: offlineMessage
      });

    const reloadedTicket = await ShowTicketService(ticket.id, ticket.companyId);
    io.to(reloadedTicket.status)
      .to(`company-${ticket.companyId}-${reloadedTicket.status}`)
      .emit("ticket", {
        action: "update",
        ticket: reloadedTicket
      });

    return res.status(200).json(offlineMessage);
  }

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit("appMessage", {
    action: "update",
    message
  });

  return res.send();
};

export const forward = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId, ticketIds } = req.body;
  const { companyId } = req.user;

  await ForwardMessageService({
    messageId,
    ticketIds: Array.isArray(ticketIds) ? ticketIds : [ticketIds],
    companyId
  });

  return res.status(200).json({ message: "Message forwarded successfully" });
};
