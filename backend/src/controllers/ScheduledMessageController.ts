import { Request, Response } from "express";
import CreateScheduledMessageService from "../services/ScheduledMessageServices/CreateScheduledMessageService";
import ListScheduledMessagesService from "../services/ScheduledMessageServices/ListScheduledMessagesService";
import UpdateScheduledMessageService from "../services/ScheduledMessageServices/UpdateScheduledMessageService";
import DeleteScheduledMessageService from "../services/ScheduledMessageServices/DeleteScheduledMessageService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { contactId, userId } = req.query as { contactId?: string; userId?: string };

  const scheduledMessages = await ListScheduledMessagesService({
    companyId,
    contactId,
    userId
  });

  return res.status(200).json(scheduledMessages);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { body, sendAt, contactId, ticketId } = req.body;
  const { id: userId, companyId } = req.user;

  const scheduledMessage = await CreateScheduledMessageService({
    body,
    sendAt,
    contactId,
    companyId,
    userId: Number(userId),
    ticketId
  });

  return res.status(200).json(scheduledMessage);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { body, sendAt, contactId } = req.body;
  const { companyId } = req.user;

  const scheduledMessage = await UpdateScheduledMessageService({
    id,
    body,
    sendAt,
    contactId,
    companyId
  });

  return res.status(200).json(scheduledMessage);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteScheduledMessageService(id, companyId);

  return res.status(200).json({ message: "Scheduled message deleted" });
};
