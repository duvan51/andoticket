import UpdateTicketService from "./UpdateTicketService";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number;
  whatsappId?: number;
}

interface Request {
  ticketIds: number[];
  ticketData: TicketData;
}

const BulkUpdateTicketsService = async ({
  ticketIds,
  ticketData
}: Request): Promise<void> => {
  for (const ticketId of ticketIds) {
    try {
      await UpdateTicketService({
        ticketData,
        ticketId
      });
    } catch (err) {
      // Ignore individual errors during bulk action to allow remaining ones to complete
    }
  }
};

export default BulkUpdateTicketsService;
