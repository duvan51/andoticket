import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";
import GetTicketWbot from "./GetTicketWbot";
import { getJid } from "./GetJid";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  await Message.update(
    { read: true },
    {
      where: {
        ticketId: ticket.id,
        read: false
      }
    }
  );

  await ticket.update({ unreadMessages: 0 });

  if (ticket.contact.number.startsWith("user_")) {
    const unreadMessages = await Message.findAll({
      where: {
        ticketId: ticket.id,
        read: false,
        fromMe: false
      }
    });

    if (unreadMessages.length > 0) {
      const io = getIO();
      for (const msg of unreadMessages) {
        if (msg.id.endsWith("-rec")) {
          const senderMsgId = msg.id.replace("-rec", "");
          const senderMsg = await Message.findByPk(senderMsgId);
          if (senderMsg) {
            await senderMsg.update({ ack: 3 });
            io.to(senderMsg.ticketId.toString()).emit("appMessage", {
              action: "update",
              message: senderMsg
            });
          }
        }
      }
    }
  } else {
    try {
      const wbot = await GetTicketWbot(ticket);
      await wbot.sendSeen(
        ticket.isGroup ? `${ticket.contact.number}@g.us` : getJid(ticket.contact.number)
      );
    } catch (err) {
      logger.warn(
        `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
      );
    }
  }

  const io = getIO();
  io.to(ticket.status).to("notification").emit("ticket", {
    action: "updateUnread",
    ticketId: ticket.id
  });
};

export default SetTicketMessagesAsRead;
