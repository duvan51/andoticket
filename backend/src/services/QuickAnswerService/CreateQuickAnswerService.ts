import AppError from "../../errors/AppError";
import QuickAnswer from "../../models/QuickAnswer";

interface Request {
  shortcut: string;
  message: string;
  companyId: number;
  userId?: number | null;
}

const CreateQuickAnswerService = async ({
  shortcut,
  message,
  companyId,
  userId
}: Request): Promise<QuickAnswer> => {
  const nameExists = await QuickAnswer.findOne({
    where: {
      shortcut,
      companyId,
      userId: userId || null
    }
  });

  if (nameExists) {
    throw new AppError("ERR__SHORTCUT_DUPLICATED");
  }

  const quickAnswer = await QuickAnswer.create({
    shortcut,
    message,
    companyId,
    userId: userId || null
  });

  return quickAnswer;
};

export default CreateQuickAnswerService;
