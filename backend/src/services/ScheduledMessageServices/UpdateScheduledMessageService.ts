import ScheduledMessage from "../../models/ScheduledMessage";
import AppError from "../../errors/AppError";

interface Request {
  id: string | number;
  body?: string;
  sendAt?: string | Date;
  contactId?: number;
  companyId: number;
}

const UpdateScheduledMessageService = async ({
  id,
  body,
  sendAt,
  contactId,
  companyId
}: Request): Promise<ScheduledMessage> => {
  const scheduledMessage = await ScheduledMessage.findOne({
    where: { id, companyId }
  });

  if (!scheduledMessage) {
    throw new AppError("ERR_NO_SCHEDULED_MESSAGE_FOUND", 404);
  }

  const updateData: any = {};
  if (body !== undefined) updateData.body = body;
  if (sendAt !== undefined) updateData.sendAt = new Date(sendAt);
  if (contactId !== undefined) updateData.contactId = contactId;

  await scheduledMessage.update(updateData);

  return scheduledMessage;
};

export default UpdateScheduledMessageService;
