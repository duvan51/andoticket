import QuickAnswer from "../../models/QuickAnswer";
import AppError from "../../errors/AppError";

interface Request {
  id: string;
  companyId: number;
}

const ShowQuickAnswerService = async ({ id, companyId }: Request): Promise<QuickAnswer> => {
  const quickAnswer = await QuickAnswer.findOne({
    where: { id, companyId }
  });

  if (!quickAnswer) {
    throw new AppError("ERR_NO_QUICK_ANSWERS_FOUND", 404);
  }

  return quickAnswer;
};

export default ShowQuickAnswerService;
