import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

interface Request {
  ticketId: string | number;
  companyId: number;
  userId?: number;
}

const ExitTicketFlowService = async ({
  ticketId,
  companyId,
  userId
}: Request): Promise<Ticket> => {
  const ticket = await ShowTicketService(ticketId, companyId);

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  const updateData: any = {
    flowStopped: true,
    currentOptionId: null as any
  };

  if (userId) {
    updateData.userId = userId;
    updateData.status = "open";
  }

  await ticket.update(updateData);
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

  return ticket;
};

export default ExitTicketFlowService;
