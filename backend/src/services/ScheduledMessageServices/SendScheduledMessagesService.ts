import { Op } from "sequelize";
import ScheduledMessage from "../../models/ScheduledMessage";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";

export const SendScheduledMessagesService = async (): Promise<void> => {
  const scheduledMessages = await ScheduledMessage.findAll({
    where: {
      sentAt: null,
      sendAt: {
        [Op.lte]: new Date()
      }
    },
    include: ["ticket", "contact"]
  });

  if (scheduledMessages.length === 0) return;

  for (const schedule of scheduledMessages) {
    let ticket = schedule.ticket;
    try {
      if (!ticket) {
        // Find default or first active whatsapp connection for this company
        const whatsapp = await Whatsapp.findOne({
          where: { companyId: schedule.companyId, status: "CONNECTED" }
        }) || await Whatsapp.findOne({
          where: { companyId: schedule.companyId }
        });

        if (!whatsapp) {
          logger.warn(`No whatsapp connection found for company ${schedule.companyId} to send scheduled message ${schedule.id}`);
          continue;
        }

        const contact = await Contact.findByPk(schedule.contactId);
        if (!contact) {
          logger.warn(`No contact found for scheduled message ${schedule.id}`);
          continue;
        }

        ticket = await FindOrCreateTicketService(
          contact,
          whatsapp.id,
          0,
          schedule.companyId
        );
      }

      await SendWhatsAppMessage({
        body: schedule.body,
        ticket
      });

      await schedule.update({
        sentAt: new Date(),
        ticketId: ticket.id
      });

      // Create success log message
      const randomId = Math.random().toString(36).substring(2, 15);
      const logMessage = await Message.create({
        id: `note-${randomId}`,
        ticketId: ticket.id,
        contactId: ticket.contactId,
        body: `Mensaje programado enviado`,
        fromMe: true,
        read: true,
        mediaType: "schedule_history",
        companyId: schedule.companyId
      });

      const io = getIO();
      // Emit log message
      io.to(ticket.id.toString())
        .to(`company-${schedule.companyId}-open`)
        .to(`company-${schedule.companyId}-notification`)
        .emit("appMessage", {
          action: "create",
          message: logMessage
        });

      // Emit delete schedule bubble message
      io.to(ticket.id.toString()).emit("appMessage", {
        action: "delete_schedule",
        scheduleId: schedule.id
      });

      logger.info(`Scheduled message ${schedule.id} sent successfully`);
    } catch (err: any) {
      logger.error(`Error sending scheduled message ${schedule.id}: ${err.message || err}`);
      await schedule.update({
        sentAt: new Date(),
        body: `[Fallo al enviar: ${err.message || err}] ${schedule.body}`
      });

      const targetTicketId = ticket ? ticket.id : schedule.ticketId;
      if (targetTicketId) {
        // Create failure log message
        const randomId = Math.random().toString(36).substring(2, 15);
        const logMessage = await Message.create({
          id: `note-${randomId}`,
          ticketId: targetTicketId,
          contactId: schedule.contactId,
          body: `Fallo al enviar mensaje programado: ${err.message || err}`,
          fromMe: true,
          read: true,
          mediaType: "schedule_history",
          companyId: schedule.companyId
        });

        const io = getIO();
        io.to(targetTicketId.toString())
          .to(`company-${schedule.companyId}-open`)
          .to(`company-${schedule.companyId}-notification`)
          .emit("appMessage", {
            action: "create",
            message: logMessage
          });

        io.to(targetTicketId.toString()).emit("appMessage", {
          action: "delete_schedule",
          scheduleId: schedule.id
        });
      }
    }
  }
};
