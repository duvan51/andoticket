import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import ScheduledMessage from "../../models/ScheduledMessage";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface Request {
  ticketId: string;
  pageNumber?: string;
  userId?: number;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  userId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // await setMessagesAsRead(ticket);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await Message.findAndCountAll({
    where: { ticketId },
    limit,
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ],
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  // Fetch pending scheduled messages for this ticket to append at the end
  const scheduledMessages = await ScheduledMessage.findAll({
    where: { ticketId, sentAt: null },
    order: [["sendAt", "ASC"]]
  });

  const serializedSchedules = scheduledMessages.map(sm => ({
    ...sm.toJSON(),
    isScheduled: true,
    createdAt: sm.sendAt
  })) as any;

  let finalMessages = messages.reverse();

  if (ticket.contact?.number?.startsWith("user_group_") && userId) {
    const senderContactNumber = `user_${userId}`;
    const senderContact = await Contact.findOne({
      where: { number: senderContactNumber, companyId: ticket.companyId }
    });

    finalMessages = finalMessages.map(msg => {
      const msgJson = msg.toJSON() as any;
      if (senderContact && msg.contactId === senderContact.id) {
        msgJson.fromMe = true;
      } else {
        msgJson.fromMe = false;
      }
      return msgJson;
    });
  }

  return {
    messages: [...finalMessages, ...serializedSchedules],
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
