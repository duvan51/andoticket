import ScheduledMessage from "../../models/ScheduledMessage";
import AppError from "../../errors/AppError";

const DeleteScheduledMessageService = async (
  id: string | number,
  companyId: number
): Promise<void> => {
  const scheduledMessage = await ScheduledMessage.findOne({
    where: { id, companyId }
  });

  if (!scheduledMessage) {
    throw new AppError("ERR_NO_SCHEDULED_MESSAGE_FOUND", 404);
  }

  await scheduledMessage.destroy();
};

export default DeleteScheduledMessageService;
