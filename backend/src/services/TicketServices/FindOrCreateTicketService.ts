import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  companyId: number,
  groupContact?: Contact
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      whatsappId: whatsappId,
      companyId
    }
  });

  if (ticket) {
    let newUnread = ticket.unreadMessages;
    if (unreadMessages > 0) {
      newUnread = Math.max(ticket.unreadMessages + 1, unreadMessages);
    }
    await ticket.update({ unreadMessages: newUnread });
  }

  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact.id,
        whatsappId: whatsappId,
        companyId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      let newUnread = ticket.unreadMessages;
      if (unreadMessages > 0) {
        newUnread = Math.max(ticket.unreadMessages + 1, unreadMessages);
      }
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages: newUnread,
        queueId: null,
        currentOptionId: null,
        flowStopped: false
      });
    }
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        whatsappId: whatsappId,
        companyId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      let newUnread = ticket.unreadMessages;
      if (unreadMessages > 0) {
        newUnread = Math.max(ticket.unreadMessages + 1, unreadMessages);
      }
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages: newUnread,
        queueId: null,
        currentOptionId: null,
        flowStopped: false
      });
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      companyId
    });
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  return ticket;
};

export default FindOrCreateTicketService;
