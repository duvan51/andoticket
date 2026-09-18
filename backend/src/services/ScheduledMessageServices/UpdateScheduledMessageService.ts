import ScheduledMessage from "../../models/ScheduledMessage";
import AppError from "../../errors/AppError";

interface Request {
  id: string | number;
  body?: string;
  sendAt?: string | Date;
  contactId?: number;
  companyId: number;
  mediaType?: string;
  mediaUrl?: string;
  mediaName?: string;
  status?: string;
}

const UpdateScheduledMessageService = async ({
  id,
  body,
  sendAt,
  contactId,
  companyId,
  mediaType,
  mediaUrl,
  mediaName,
  status
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
  if (mediaType !== undefined) updateData.mediaType = mediaType;
  if (mediaUrl !== undefined) updateData.mediaUrl = mediaUrl;
  if (mediaName !== undefined) updateData.mediaName = mediaName;
  if (status !== undefined) updateData.status = status;

  await scheduledMessage.update(updateData);

  return scheduledMessage;
};

export default UpdateScheduledMessageService;
