import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import ScheduledMessage from "../../models/ScheduledMessage";
import ContactCustomField from "../../models/ContactCustomField";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { getIO } from "../../libs/socket";
import AppError from "../../errors/AppError";

const MergeContactByIdsService = async (
  sourceContactId: number | string,
  targetContactId: number | string,
  companyId: number
): Promise<Contact> => {
  const sourceContact = await Contact.findOne({
    where: { id: sourceContactId, companyId }
  });

  const targetContact = await Contact.findOne({
    where: { id: targetContactId, companyId }
  });

  if (!sourceContact || !targetContact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const io = getIO();

  // Find all tickets of the source contact to update and emit socket events
  const ticketsToUpdate = await Ticket.findAll({
    where: { contactId: sourceContact.id, companyId }
  });

  for (const ticket of ticketsToUpdate) {
    await ticket.update({ contactId: targetContact.id });
    
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
    { contactId: targetContact.id },
    { where: { contactId: sourceContact.id } }
  );

  // Re-link scheduled messages
  await ScheduledMessage.update(
    { contactId: targetContact.id },
    { where: { contactId: sourceContact.id, companyId } }
  );

  // Re-link custom fields
  try {
    await ContactCustomField.update(
      { contactId: targetContact.id },
      { where: { contactId: sourceContact.id } }
    );
  } catch (err) {
    // ignore unique constraint errors for custom fields
  }

  // Delete source contact
  await sourceContact.destroy();

  return targetContact;
};

export default MergeContactByIdsService;
