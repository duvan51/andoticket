import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import AppError from "../errors/AppError";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

import { validate } from "../middleware/validate";
import { whatsappSchema, whatsappUpdateSchema } from "../validators";

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const whatsapps = await ListWhatsAppsService(companyId);

  return res.status(200).json(whatsapps);
};

export const store = [
  validate(whatsappSchema),
  async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const {
      name,
      status,
      isDefault,
      greetingMessage,
      farewellMessage,
      queueIds
    } = req.body;

    const { companyId } = req.user;

    const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
      name,
      status,
      isDefault,
      greetingMessage,
      farewellMessage,
      queueIds,
      companyId
    });

    // StartWhatsAppSession(whatsapp);

    const io = getIO();
    io.emit("whatsapp", {
      action: "update",
      whatsapp
    });

    if (oldDefaultWhatsapp) {
      io.emit("whatsapp", {
        action: "update",
        whatsapp: oldDefaultWhatsapp
      });
    }

    return res.status(200).json(whatsapp);
  }
];

export const show = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { whatsappId } = req.params;

  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  return res.status(200).json(whatsapp);
};

export const update = [
  validate(whatsappUpdateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { whatsappId } = req.params;
    const whatsappData = req.body;

    const { companyId } = req.user;

    const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
      whatsappData,
      whatsappId,
      companyId
    });

    const io = getIO();
    io.emit("whatsapp", {
      action: "update",
      whatsapp
    });

    if (oldDefaultWhatsapp) {
      io.emit("whatsapp", {
        action: "update",
        whatsapp: oldDefaultWhatsapp
      });
    }

    return res.status(200).json(whatsapp);
  }
];

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { whatsappId } = req.params;

  const { companyId } = req.user;

  await DeleteWhatsAppService(whatsappId, companyId);
  await removeWbot(+whatsappId);

  const io = getIO();
  io.emit("whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};
