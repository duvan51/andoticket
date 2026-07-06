import { format } from "date-fns";
import ScheduledMessage from "../../models/ScheduledMessage";
import Message from "../../models/Message";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

interface Request {
  body: string;
  sendAt: string | Date;
  contactId: number;
  companyId: number;
  userId: number;
  ticketId?: number;
}

const CreateScheduledMessageService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  ticketId
}: Request): Promise<ScheduledMessage> => {
  if (!body) {
    throw new AppError("ERR_SCHEDULED_MESSAGE_BODY_REQUIRED", 400);
  }

  const scheduledMessage = await ScheduledMessage.create({
    body,
    sendAt: new Date(sendAt),
    contactId,
    companyId,
    userId,
    ticketId
  });

  if (ticketId) {
    const dateFormatted = format(new Date(sendAt), "dd/MM/yyyy HH:mm");
    const randomId = Math.random().toString(36).substring(2, 15);
    const logMessage = await Message.create({
      id: `note-${randomId}`,
      ticketId,
      contactId,
      body: `Mensaje programado para el ${dateFormatted}`,
      fromMe: true,
      read: true,
      mediaType: "schedule_history",
      companyId
    });

    const io = getIO();
    // Emit log message
    io.to(ticketId.toString())
      .to(`company-${companyId}-open`)
      .to(`company-${companyId}-notification`)
      .emit("appMessage", {
        action: "create",
        message: logMessage
      });

    // Emit pending scheduled bubble message
    io.to(ticketId.toString()).emit("appMessage", {
      action: "create",
      message: {
        ...scheduledMessage.toJSON(),
        isScheduled: true,
        createdAt: scheduledMessage.sendAt
      }
    });
  }

  return scheduledMessage;
};

export default CreateScheduledMessageService;
