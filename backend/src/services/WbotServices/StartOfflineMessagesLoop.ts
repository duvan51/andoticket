import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";

export const StartOfflineMessagesLoop = (): void => {
  logger.info("Offline messages outbox loop started");
  
  setInterval(async () => {
    try {
      // Find all offline messages (ack = -1)
      const offlineMessages = await Message.findAll({
        where: { ack: -1 },
        order: [["createdAt", "ASC"]]
      });

      if (offlineMessages.length === 0) return;

      for (const msg of offlineMessages) {
        const ticket = await Ticket.findByPk(msg.ticketId, {
          include: [
            {
              model: Contact,
              as: "contact",
              attributes: ["id", "name", "number"]
            }
          ]
        });

        if (!ticket) continue;

        try {
          // Attempt to send the message to WhatsApp
          const sentMessage = await SendWhatsAppMessage({
            body: msg.body,
            ticket
          });

          // If sending succeeded, update database message ID and ack
          const oldMessageId = msg.id;

          await Message.update(
            { id: sentMessage.id._serialized, ack: 1 },
            { where: { id: oldMessageId } }
          );

          const updatedMessage = await Message.findByPk(sentMessage.id._serialized, {
            include: [
              {
                model: Contact,
                as: "contact",
                attributes: ["id", "name", "number", "profilePicUrl"]
              }
            ]
          });

          // Notify frontend client via Socket.io
          const io = getIO();
          
          // Delete old offline message from the UI
          io.to(msg.ticketId.toString()).emit("appMessage", {
            action: "delete",
            messageId: oldMessageId
          });
          
          // Create new sent message in the UI
          io.to(msg.ticketId.toString()).emit("appMessage", {
            action: "create",
            message: updatedMessage
          });

        } catch (sendErr) {
          // WhatsApp session is still disconnected, break out to preserve chronological ordering
          break;
        }
      }
    } catch (err: any) {
      logger.error(`Error in Offline Messages Loop: ${err.message || err}`);
    }
  }, 15000);
};
