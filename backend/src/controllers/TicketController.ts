import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import formatBody from "../helpers/Mustache";

import { validate } from "../middleware/validate";
import { ticketSchema, ticketUpdateSchema, ticketIndexQuerySchema } from "../validators";
import User from "../models/User";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import AppError from "../errors/AppError";

interface IndexQuery {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  showAll?: string;
  withUnreadMessages?: string;
  queueIds?: string;
  tagId?: string;
  unanswered?: string;
  isInternal?: string;
  userId?: string;
}

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
}

export const index = [
  validate(ticketIndexQuerySchema),
  async (req: Request, res: Response): Promise<Response> => {
    const {
      pageNumber,
      status,
      date,
      searchParam,
      showAll,
      queueIds: queueIdsStringified,
      withUnreadMessages,
      tagId,
      unanswered,
      isInternal,
      userId: queryUserId
    } = req.query as IndexQuery;

    let userId: string | number | undefined = req.user.id;

    if (showAll === "true") {
      userId = queryUserId ? parseInt(queryUserId, 10) : undefined;
    }

    let queueIds: number[] = [];

    if (queueIdsStringified) {
      try {
        const parsed = JSON.parse(queueIdsStringified);
        if (Array.isArray(parsed)) {
          queueIds = parsed.filter((item): item is number => typeof item === "number");
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    const { tickets, count, hasMore } = await ListTicketsService({
      searchParam,
      pageNumber,
      status,
      date,
      showAll,
      userId,
      queueIds,
      withUnreadMessages,
      tagId,
      unanswered,
      companyId: req.user.companyId,
      isInternal
    });

    return res.status(200).json({ tickets, count, hasMore });
  }
];

export const store = [
  validate(ticketSchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { contactId, status, userId } = req.body;

    const ticket = await CreateTicketService({ contactId, status, userId });

    const io = getIO();
    io.to(ticket.status)
      .to(`company-${ticket.companyId}-${ticket.status}`)
      .emit("ticket", {
        action: "update",
        ticket
      });

    return res.status(200).json(ticket);
  }
];

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowTicketService(ticketId, companyId);

  return res.status(200).json(contact);
};

export const update = [
  validate(ticketUpdateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { ticketId } = req.params;
    const ticketData = req.body;

    const { ticket } = await UpdateTicketService({
      ticketData,
      ticketId
    });

    if (ticket.status === "closed") {
      const whatsapp = await ShowWhatsAppService(ticket.whatsappId);

      const { farewellMessage } = whatsapp;

      if (farewellMessage) {
        await SendWhatsAppMessage({
          body: formatBody(farewellMessage, ticket.contact),
          ticket
        });
      }
    }

    return res.status(200).json(ticket);
  }
];

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticket.status)
    .to(ticketId)
    .to("notification")
    .to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`company-${ticket.companyId}-notification`)
    .emit("ticket", {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};

export const createInternalTicket = async (req: Request, res: Response): Promise<Response> => {
  const { targetUserId } = req.body;
  const { id: currentUserId, companyId } = req.user;

  if (!targetUserId) {
    throw new AppError("ERR_NO_TARGET_USER", 400);
  }

  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser || targetUser.companyId !== companyId) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const targetContactName = targetUser.name;
  const targetContactNumber = `user_${targetUser.id}`;
  let [targetContact] = await Contact.findOrCreate({
    where: { number: targetContactNumber, companyId },
    defaults: { name: targetContactName, number: targetContactNumber, companyId }
  });

  if (targetContact.name !== targetUser.name) {
    await targetContact.update({ name: targetUser.name });
  }

  let [ticket] = await Ticket.findOrCreate({
    where: {
      contactId: targetContact.id,
      userId: currentUserId,
      companyId
    },
    defaults: {
      contactId: targetContact.id,
      userId: currentUserId,
      companyId,
      status: "open",
      unreadMessages: 0
    }
  });

  const reloadedTicket = await ShowTicketService(ticket.id, companyId);

  const io = getIO();
  io.to(reloadedTicket.status)
    .to(`company-${companyId}-${reloadedTicket.status}`)
    .emit("ticket", {
      action: "update",
      ticket: reloadedTicket
    });

  return res.status(200).json(reloadedTicket);
};

export const createInternalGroupTicket = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const groupContactName = "Chat General";
  const groupContactNumber = `user_group_${companyId}`;
  let [groupContact] = await Contact.findOrCreate({
    where: { number: groupContactNumber, companyId },
    defaults: { name: groupContactName, number: groupContactNumber, companyId, isGroup: true }
  });

  if (groupContact.name !== groupContactName) {
    await groupContact.update({ name: groupContactName });
  }

  let [ticket] = await Ticket.findOrCreate({
    where: {
      contactId: groupContact.id,
      companyId,
      userId: null
    },
    defaults: {
      contactId: groupContact.id,
      companyId,
      userId: null,
      status: "open",
      unreadMessages: 0
    }
  });

  const reloadedTicket = await ShowTicketService(ticket.id, companyId);

  const io = getIO();
  io.to(reloadedTicket.status)
    .to(`company-${companyId}-${reloadedTicket.status}`)
    .emit("ticket", {
      action: "update",
      ticket: reloadedTicket
    });

  return res.status(200).json(reloadedTicket);
};
