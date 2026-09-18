import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import TicketTracking from "../../models/TicketTracking";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import ShowTicketService from "./ShowTicketService";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
  flowStopped?: boolean;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId
}: Request): Promise<Response> => {
  const { status, userId, queueId, whatsappId } = ticketData;

  const ticket = await ShowTicketService(ticketId);
  await SetTicketMessagesAsRead(ticket);

  if (whatsappId && ticket.whatsappId !== whatsappId) {
    await CheckContactOpenTickets(ticket.contactId, whatsappId);
  }

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id, ticket.whatsappId);
  }

  // Tracking Logic
  if (status !== oldStatus || userId !== oldUserId) {
    const currentTracking = await TicketTracking.findOne({
      where: { ticketId: ticketId, finishedAt: null },
      order: [["createdAt", "DESC"]]
    });
    if (currentTracking) {
      await currentTracking.update({ finishedAt: new Date() });
    }

    if (status === "open") {
      await TicketTracking.create({
        ticketId: Number(ticketId),
        whatsappId: ticket.whatsappId,
        userId: userId,
        createdAt: new Date()
      });
    }
  }

  let currentOptionId = ticket.currentOptionId;
  let flowStopped = ticketData.flowStopped !== undefined ? ticketData.flowStopped : ticket.flowStopped;

  if (queueId !== undefined && ticket.queueId !== queueId) {
    currentOptionId = null as any;
    if (ticketData.flowStopped === undefined) {
      flowStopped = false;
    }
  }
  if (status !== undefined && status !== "pending") {
    currentOptionId = null as any;
  }
  if (status === "closed") {
    flowStopped = false;
    currentOptionId = null as any;
  }

  await ticket.update({
    status,
    queueId,
    userId,
    currentOptionId,
    flowStopped
  });

  if (whatsappId) {
    await ticket.update({
      whatsappId
    });
  }

  await ticket.reload();

  const io = getIO();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(oldStatus)
      .to(`company-${ticket.companyId}-${oldStatus}`)
      .emit("ticket", {
        action: "delete",
        ticketId: ticket.id
      });
  }

  io.to(ticket.status)
    .to("notification")
    .to(ticketId.toString())
    .to(`company-${ticket.companyId}-${ticket.status}`)
    .to(`company-${ticket.companyId}-notification`)
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
