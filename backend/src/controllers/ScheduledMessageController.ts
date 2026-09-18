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
  const {
    body,
    sendAt,
    contactId,
    ticketId,
    mediaType,
    sendConfirmation,
    schedule24hReminder,
    scheduleSameDayReminder
  } = req.body;
  const { id: userId, companyId } = req.user;

  let mediaUrl: string | undefined;
  let mediaName: string | undefined;
  let mediaTypeVal = mediaType;

  if (req.file) {
    mediaUrl = req.file.filename;
    mediaName = req.file.originalname;
    mediaTypeVal = req.file.mimetype.split("/")[0];
  }

  const scheduledMessage = await CreateScheduledMessageService({
    body,
    sendAt,
    contactId,
    companyId,
    userId: Number(userId),
    ticketId,
    mediaType: mediaTypeVal || "message",
    mediaUrl,
    mediaName,
    sendConfirmation: sendConfirmation === true || sendConfirmation === "true",
    schedule24hReminder: schedule24hReminder === true || schedule24hReminder === "true",
    scheduleSameDayReminder: scheduleSameDayReminder === true || scheduleSameDayReminder === "true"
  });

  return res.status(200).json(scheduledMessage);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { body, sendAt, contactId, mediaType, status } = req.body;
  const { companyId } = req.user;

  let mediaUrl: string | undefined;
  let mediaName: string | undefined;
  let mediaTypeVal = mediaType;

  if (req.file) {
    mediaUrl = req.file.filename;
    mediaName = req.file.originalname;
    mediaTypeVal = req.file.mimetype.split("/")[0];
  } else if (req.body.mediaUrl === "") {
    mediaUrl = "";
    mediaName = "";
  }

  const scheduledMessage = await UpdateScheduledMessageService({
    id,
    body,
    sendAt,
    contactId,
    companyId,
    mediaType: mediaTypeVal,
    mediaUrl,
    mediaName,
    status
  });

  return res.status(200).json(scheduledMessage);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteScheduledMessageService(id, companyId);

  return res.status(200).json({ message: "Scheduled message deleted" });
};
