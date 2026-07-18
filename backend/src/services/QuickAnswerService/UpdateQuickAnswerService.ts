import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

interface QuickAnswerData {
  shortcut?: string;
  message?: string;
  userId?: number | null;
}

interface Request {
  quickAnswerData: QuickAnswerData;
  quickAnswerId: string;
  companyId: number;
  userId: number;
  userProfile: string;
}

const UpdateQuickAnswerService = async ({
  quickAnswerData,
  quickAnswerId,
  companyId,
  userId,
  userProfile
}: Request): Promise<QuickAnswer> => {
  const { shortcut, message, userId: newUserId } = quickAnswerData;

  const quickAnswer = await QuickAnswer.findOne({
    where: { id: quickAnswerId, companyId },
    attributes: ["id", "shortcut", "message", "userId", "companyId"]
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  if (userProfile !== "admin" && quickAnswer.userId !== userId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const updateData: any = { shortcut, message };
  if (userProfile === "admin" && newUserId !== undefined) {
    updateData.userId = newUserId;
  }

  await quickAnswer.update(updateData);

  await quickAnswer.reload({
    attributes: ["id", "shortcut", "message", "userId", "companyId"]
  });

  return quickAnswer;
};

export default UpdateQuickAnswerService;
