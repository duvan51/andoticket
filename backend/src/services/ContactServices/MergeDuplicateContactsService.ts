import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import ScheduledMessage from "../../models/ScheduledMessage";
import ContactCustomField from "../../models/ContactCustomField";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { getIO } from "../../libs/socket";

const MergeDuplicateContactsService = async (companyId: number): Promise<{ mergedCount: number }> => {
  const contacts = await Contact.findAll({
    where: { companyId },
    order: [["id", "ASC"]]
  });

  const suffixMap: { [suffix: string]: Contact[] } = {};

  for (const contact of contacts) {
    if (contact.isGroup || !contact.number || contact.number.length < 10) {
      continue;
    }
    const suffix = contact.number.slice(-10);
    if (!suffixMap[suffix]) {
      suffixMap[suffix] = [];
    }
    suffixMap[suffix].push(contact);
  }

  let mergedCount = 0;

  for (const suffix of Object.keys(suffixMap)) {
    const list = suffixMap[suffix];
    if (list.length > 1) {
      // Find the master contact (the one with the longest number, e.g. international format)
      list.sort((a, b) => {
        if (b.number.length !== a.number.length) {
          return b.number.length - a.number.length; // descending by length
        }
        return a.id - b.id; // ascending by ID (older first)
      });

      const master = list[0];
      const duplicates = list.slice(1);

      const io = getIO();

      for (const duplicate of duplicates) {
        // Re-link tickets and emit socket updates
        const ticketsToUpdate = await Ticket.findAll({
          where: { contactId: duplicate.id, companyId }
        });

        for (const ticket of ticketsToUpdate) {
          await ticket.update({ contactId: master.id });
          try {
            const reloadedTicket = await ShowTicketService(ticket.id, companyId);
            io.to(reloadedTicket.status)
              .to(`company-${companyId}-${reloadedTicket.status}`)
              .emit("ticket", {
                action: "update",
                ticket: reloadedTicket
              });
          } catch (err) {
            // Ignore socket emit errors
          }
        }

        // Re-link messages
        await Message.update(
          { contactId: master.id },
          { where: { contactId: duplicate.id } }
        );

        // Re-link scheduled messages
        await ScheduledMessage.update(
          { contactId: master.id },
          { where: { contactId: duplicate.id, companyId } }
        );

        // Re-link custom fields
        try {
          await ContactCustomField.update(
            { contactId: master.id },
            { where: { contactId: duplicate.id } }
          );
        } catch (err) {
          // ignore unique constraint errors for custom fields
        }

        // Delete duplicate contact
        await duplicate.destroy();
        mergedCount++;
      }
    }
  }

  return { mergedCount };
};

export default MergeDuplicateContactsService;
