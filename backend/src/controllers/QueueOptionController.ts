import { Request, Response } from "express";
import QueueOption from "../models/QueueOption";
import Queue from "../models/Queue";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { queueId, parentId, option, title, message } = req.body;
  const { companyId } = req.user;

  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const queue = await Queue.findByPk(queueId);
  if (!queue || queue.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const queueOption = await QueueOption.create({
    queueId,
    parentId: parentId || null,
    option,
    title,
    message
  });

  const io = getIO();
  io.emit("queueOption", {
    action: "create",
    queueOption
  });

  return res.status(200).json(queueOption);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { optionId } = req.params;
  const { option, title, message } = req.body;
  const { companyId } = req.user;

  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const queueOption = await QueueOption.findByPk(optionId, {
    include: ["queue"]
  });

  if (!queueOption || !queueOption.queue || queueOption.queue.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await queueOption.update({
    option,
    title,
    message
  });

  const io = getIO();
  io.emit("queueOption", {
    action: "update",
    queueOption
  });

  return res.status(200).json(queueOption);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { optionId } = req.params;
  const { companyId } = req.user;

  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const queueOption = await QueueOption.findByPk(optionId, {
    include: ["queue"]
  });

  if (!queueOption || !queueOption.queue || queueOption.queue.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await queueOption.destroy();

  const io = getIO();
  io.emit("queueOption", {
    action: "delete",
    optionId: +optionId
  });

  return res.status(200).send();
};
