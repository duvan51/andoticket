import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import ListMediaGalleryService from "../services/MediaGalleryServices/ListMediaGalleryService";
import CreateMediaGalleryService from "../services/MediaGalleryServices/CreateMediaGalleryService";
import UpdateMediaGalleryService from "../services/MediaGalleryServices/UpdateMediaGalleryService";
import DeleteMediaGalleryService from "../services/MediaGalleryServices/DeleteMediaGalleryService";
import SendMediaGalleryService from "../services/MediaGalleryServices/SendMediaGalleryService";

type IndexQuery = {
  searchParam?: string;
  mediaType?: string;
  pageNumber?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, mediaType, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListMediaGalleryService({
    companyId,
    searchParam,
    mediaType,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { title, caption } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new AppError("ERR_NO_FILES_UPLOADED", 400);
  }

  const createdRecords = await CreateMediaGalleryService({
    files,
    title,
    caption,
    companyId,
    userId: Number(userId)
  });

  return res.status(200).json(createdRecords);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { mediaId } = req.params;
  const { companyId } = req.user;
  const { title, caption } = req.body;

  const schema = Yup.object().shape({
    title: Yup.string().required()
  });

  try {
    await schema.validate({ title });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const updatedMedia = await UpdateMediaGalleryService({
    id: mediaId,
    title,
    caption,
    companyId
  });

  return res.status(200).json(updatedMedia);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { mediaId } = req.params;
  const { companyId } = req.user;

  await DeleteMediaGalleryService({
    id: mediaId,
    companyId
  });

  return res.status(200).json({ message: "Media deleted successfully" });
};

export const sendToTicket = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { mediaIds, customCaption } = req.body;
  const { companyId } = req.user;

  if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
    throw new AppError("ERR_NO_MEDIA_SELECTED", 400);
  }

  await SendMediaGalleryService({
    ticketId,
    mediaIds,
    customCaption,
    companyId
  });

  return res.status(200).json({ message: "Media sent to ticket successfully" });
};
