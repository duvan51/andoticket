import { format } from "date-fns";
import ScheduledMessage from "../../models/ScheduledMessage";
import Message from "../../models/Message";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";

interface Request {
  body: string;
  sendAt: string | Date;
  contactId: number;
  companyId: number;
  userId: number;
  ticketId?: number;
  mediaType?: string;
  mediaUrl?: string;
  mediaName?: string;
  sendConfirmation?: boolean;
  schedule24hReminder?: boolean;
  scheduleSameDayReminder?: boolean;
  status?: string;
}

const CreateScheduledMessageService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  ticketId,
  mediaType,
  mediaUrl,
  mediaName,
  sendConfirmation,
  schedule24hReminder,
  scheduleSameDayReminder,
  status
}: Request): Promise<ScheduledMessage> => {
  if (!body && !mediaUrl) {
    throw new AppError("ERR_SCHEDULED_MESSAGE_BODY_REQUIRED", 400);
  }

  const scheduledMessage = await ScheduledMessage.create({
    body,
    sendAt: new Date(sendAt),
    contactId,
    companyId,
    userId,
    ticketId,
    mediaType: mediaType || "message",
    mediaUrl,
    mediaName,
    status: status || "pending"
  });

  // If this is an appointment, handle automated workflows
  if (mediaType === "appointment") {
    const contact = await Contact.findByPk(contactId);
    if (contact) {
      const appointmentDate = new Date(sendAt);
      const formattedDate = format(appointmentDate, "dd/MM/yyyy");
      const formattedTime = format(appointmentDate, "HH:mm");

      // 1. Immediate WhatsApp Confirmation
      if (sendConfirmation) {
        try {
          const whatsapp = await Whatsapp.findOne({
            where: { companyId, status: "CONNECTED" }
          }) || await Whatsapp.findOne({
            where: { companyId }
          });

          if (whatsapp) {
            const activeTicket = await FindOrCreateTicketService(contact, whatsapp.id, 0, companyId);
            
            const confirmationText = `*Confirmación de Cita* 📅\n\nHola *${contact.name}*, tu cita ha sido agendada con éxito:\n📅 *Fecha:* ${formattedDate}\n⏰ *Hora:* ${formattedTime}\n\n¡Te esperamos!`;
            
            await SendWhatsAppMessage({
              body: confirmationText,
              ticket: activeTicket
            });

            // Create log message in ticket history
            const randomId = Math.random().toString(36).substring(2, 15);
            const logMessage = await Message.create({
              id: `note-${randomId}`,
              ticketId: activeTicket.id,
              contactId,
              body: `Confirmación de cita enviada por WhatsApp`,
              fromMe: true,
              read: true,
              mediaType: "schedule_history",
              companyId
            });

            const io = getIO();
            io.to(activeTicket.id.toString())
              .to(`company-${companyId}-open`)
              .to(`company-${companyId}-notification`)
              .emit("appMessage", {
                action: "create",
                message: logMessage
              });
          }
        } catch (err: any) {
          console.error("Error sending immediate appointment confirmation:", err);
        }
      }

      // 2. Schedule 24h before reminder
      if (schedule24hReminder) {
        const time24hBefore = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
        if (time24hBefore > new Date()) {
          const reminder24hText = `*Recordatorio de Cita* ⏰\n\nHola *${contact.name}*, te recordamos que tienes una cita agendada para el día de mañana:\n📅 *Fecha:* ${formattedDate}\n⏰ *Hora:* ${formattedTime}\n\nSi tienes algún inconveniente, por favor avísanos con tiempo.`;
          
          await ScheduledMessage.create({
            body: reminder24hText,
            sendAt: time24hBefore,
            contactId,
            companyId,
            userId,
            ticketId,
            mediaType: "message"
          });
        }
      }

      // 3. Schedule same day (2h before) reminder
      if (scheduleSameDayReminder) {
        const timeSameDay = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
        if (timeSameDay > new Date()) {
          const reminderSameDayText = `*Recordatorio de Cita* ⏰\n\nHola *${contact.name}*, te recordamos que tu cita es el día de hoy:\n⏰ *Hora:* ${formattedTime}\n\n¡Nos vemos pronto!`;
          
          await ScheduledMessage.create({
            body: reminderSameDayText,
            sendAt: timeSameDay,
            contactId,
            companyId,
            userId,
            ticketId,
            mediaType: "message"
          });
        }
      }
    }
  }

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
