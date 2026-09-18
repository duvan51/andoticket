import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import ScheduledMessage from "../../models/ScheduledMessage";
import ContactCustomField from "../../models/ContactCustomField";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { getIO } from "../../libs/socket";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";

const MergeSingleContactService = async (
  contactId: number | string,
  companyId: number
): Promise<Contact> => {
  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (contact.isGroup || !contact.number || contact.number.length < 10) {
    return contact;
  }

  const suffix = contact.number.slice(-10);

  const contacts = await Contact.findAll({
    where: {
      companyId,
      number: {
        [Op.like]: `%${suffix}`
      }
    },
    order: [["id", "ASC"]]
  });

  if (contacts.length <= 1) {
    return contact;
  }

  // Find the master contact (the one with the longest number, e.g. international format)
  contacts.sort((a, b) => {
    if (b.number.length !== a.number.length) {
      return b.number.length - a.number.length; // descending by length
    }
    return a.id - b.id; // ascending by ID (older first)
  });

  const master = contacts[0];
  const duplicates = contacts.slice(1);

  const io = getIO();

  for (const duplicate of duplicates) {
    // Find all tickets of the duplicate contact to update and emit socket events
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
  }

  return master;
};

export default MergeSingleContactService;
