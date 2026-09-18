import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListQuickAnswerService from "../services/QuickAnswerService/ListQuickAnswerService";
import CreateQuickAnswerService from "../services/QuickAnswerService/CreateQuickAnswerService";
import ShowQuickAnswerService from "../services/QuickAnswerService/ShowQuickAnswerService";
import UpdateQuickAnswerService from "../services/QuickAnswerService/UpdateQuickAnswerService";
import DeleteQuickAnswerService from "../services/QuickAnswerService/DeleteQuickAnswerService";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

interface QuickAnswerData {
  shortcut: string;
  message: string;
  userId?: number | null;
  mediaPath?: string | null;
  mediaName?: string | null;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { quickAnswers, count, hasMore } = await ListQuickAnswerService({
    searchParam,
    pageNumber,
    companyId: req.user.companyId,
    userId: req.user.id
  });

  return res.json({ quickAnswers, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newQuickAnswer: QuickAnswerData = req.body;
  const requestFile = req.file;

  const QuickAnswerSchema = Yup.object().shape({
    shortcut: Yup.string().required(),
    message: Yup.string().nullable()
  });

  try {
    await QuickAnswerSchema.validate(newQuickAnswer);
  } catch (err) {
    throw new AppError(err.message);
  }

  let targetUserId = null;
  if (req.user.profile !== "admin") {
    targetUserId = req.user.id;
  } else if (newQuickAnswer.userId !== undefined) {
    targetUserId = newQuickAnswer.userId;
  }

  const mediaPath = requestFile ? requestFile.filename : (newQuickAnswer.mediaPath || null);
  const mediaName = requestFile ? requestFile.originalname : (newQuickAnswer.mediaName || null);

  const quickAnswer = await CreateQuickAnswerService({
    ...newQuickAnswer,
    companyId: req.user.companyId,
    userId: targetUserId,
    mediaPath,
    mediaName
  });

  const io = getIO();
  io.emit("quickAnswer", {
    action: "create",
    quickAnswer
  });

  return res.status(200).json(quickAnswer);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { quickAnswerId } = req.params;

  const quickAnswer = await ShowQuickAnswerService({
    id: quickAnswerId,
    companyId: req.user.companyId
  });

  return res.status(200).json(quickAnswer);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const quickAnswerData: QuickAnswerData = req.body;
  const requestFile = req.file;

  const schema = Yup.object().shape({
    shortcut: Yup.string(),
    message: Yup.string().nullable()
  });

  try {
    await schema.validate(quickAnswerData);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { quickAnswerId } = req.params;

  let mediaPath = quickAnswerData.mediaPath;
  let mediaName = quickAnswerData.mediaName;
  if (requestFile) {
    mediaPath = requestFile.filename;
    mediaName = requestFile.originalname;
  }

  const quickAnswer = await UpdateQuickAnswerService({
    quickAnswerData: {
      ...quickAnswerData,
      mediaPath,
      mediaName
    },
    quickAnswerId,
    companyId: req.user.companyId,
    userId: req.user.id,
    userProfile: req.user.profile
  });

  const io = getIO();
  io.emit("quickAnswer", {
    action: "update",
    quickAnswer
  });

  return res.status(200).json(quickAnswer);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { quickAnswerId } = req.params;

  await DeleteQuickAnswerService({
    id: quickAnswerId,
    companyId: req.user.companyId,
    userId: req.user.id,
    userProfile: req.user.profile
  });

  const io = getIO();
  io.emit("quickAnswer", {
    action: "delete",
    quickAnswerId
  });

  return res.status(200).json({ message: "Quick Answer deleted" });
};
