import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

interface Request {
  id: string;
  companyId: number;
  userId: number;
  userProfile: string;
}

const DeleteQuickAnswerService = async ({
  id,
  companyId,
  userId,
  userProfile
}: Request): Promise<void> => {
  const quickAnswer = await QuickAnswer.findOne({
    where: { id, companyId }
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWER_FOUND", 404);
  }

  if (userProfile !== "admin" && quickAnswer.userId !== userId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await quickAnswer.destroy();
};

export default DeleteQuickAnswerService;
