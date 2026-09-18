import DeleteTicketService from "./DeleteTicketService";
import { getIO } from "../../libs/socket";

interface Request {
  ticketIds: number[];
}

const BulkDeleteTicketsService = async ({
  ticketIds
}: Request): Promise<void> => {
  for (const ticketId of ticketIds) {
    try {
      const ticket = await DeleteTicketService(ticketId.toString());
      const io = getIO();
      io.to(ticket.status)
        .to(ticketId.toString())
        .to("notification")
        .to(`company-${ticket.companyId}-${ticket.status}`)
        .to(`company-${ticket.companyId}-notification`)
        .emit("ticket", {
          action: "delete",
          ticketId: +ticketId
        });
    } catch (err) {
      // Ignore individual errors during bulk action to allow remaining ones to complete
    }
  }
};

export default BulkDeleteTicketsService;
