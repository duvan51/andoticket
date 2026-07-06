import ScheduledMessage from "../../models/ScheduledMessage";
import Contact from "../../models/Contact";

interface Request {
  companyId: number;
  contactId?: string;
  userId?: string;
}

const ListScheduledMessagesService = async ({
  companyId,
  contactId,
  userId
}: Request): Promise<ScheduledMessage[]> => {
  const where: any = { companyId };

  if (contactId) {
    where.contactId = contactId;
  }
  if (userId) {
    where.userId = userId;
  }

  const scheduledMessages = await ScheduledMessage.findAll({
    where,
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number"] }
    ],
    order: [["sendAt", "ASC"]]
  });

  return scheduledMessages;
};

export default ListScheduledMessagesService;
