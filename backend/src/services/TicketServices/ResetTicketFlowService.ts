import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import QueueOption from "../../models/QueueOption";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import formatBody from "../../helpers/Mustache";

interface Request {
  ticketId: string | number;
  companyId: number;
}

const ResetTicketFlowService = async ({
  ticketId,
  companyId
}: Request): Promise<Ticket> => {
  const ticket = await ShowTicketService(ticketId, companyId);

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;

  const whatsapp = await ShowWhatsAppService(ticket.whatsappId);
  const { queues, greetingMessage } = whatsapp;

  let newQueueId: number | null = null;

  if (queues.length === 1) {
    newQueueId = queues[0].id;
  }

  await ticket.update({
    queueId: newQueueId,
    currentOptionId: null as any,
    userId: null as any,
    status: "pending",
    flowStopped: false
  });

  try {
    if (queues.length === 1) {
      const queueGreeting = queues[0].greetingMessage || greetingMessage || "";
      if (queueGreeting) {
        await SendWhatsAppMessage({
          body: queueGreeting,
          ticket
        });
      }

      const rootOptions = await QueueOption.findAll({
        where: {
          queueId: queues[0].id,
          parentId: null
        }
      });

      if (rootOptions.length > 0) {
        let optionsText = "";
        rootOptions.forEach(opt => {
          optionsText += `*${opt.option}* - ${opt.title}\n`;
        });
        await SendWhatsAppMessage({
          body: optionsText,
          ticket
        });
      }
    } else if (queues.length > 1) {
      let options = "";
      queues.forEach((queue, index) => {
        options += `*${index + 1}* - ${queue.name}\n`;
      });

      const greeting = greetingMessage ? `${greetingMessage}\n\n` : "¡Hola! Por favor selecciona una opción para continuar:\n\n";
      const body = `${greeting}${options}`;
      await SendWhatsAppMessage({
        body,
        ticket
      });
    } else if (greetingMessage) {
      await SendWhatsAppMessage({
        body: greetingMessage,
        ticket
      });
    }
  } catch (err) {
    console.error("Error sending flow reset message to WhatsApp:", err);
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

  return ticket;
};

export default ResetTicketFlowService;
