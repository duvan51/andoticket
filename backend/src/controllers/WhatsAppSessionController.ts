import { Request, Response } from "express";
import { getWbot, removeWbot, requestPairingCode as requestPairingCodeWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

const store = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  StartWhatsAppSession(whatsapp);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "" },
    companyId
  });

  StartWhatsAppSession(whatsapp);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  try {
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  } catch (err) {
    // If bot not found or error on logout, just proceed to cleanup
  }

  await removeWbot(whatsapp.id);

  await whatsapp.update({
    status: "DISCONNECTED",
    session: "",
    qrcode: ""
  });

  return res.status(200).json({ message: "Session disconnected." });
};

const requestPairingCode = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { whatsappId } = req.params;
  const { phoneNumber } = req.body;
  const { companyId } = req.user;

  if (!phoneNumber) {
    throw new AppError("ERR_INVALID_PHONE_NUMBER", 400);
  }

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // If session is not currently running in memory, start it
  try {
    getWbot(whatsapp.id);
  } catch (err) {
    await StartWhatsAppSession(whatsapp);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  try {
    const code = await requestPairingCodeWbot(whatsapp.id, phoneNumber);
    return res.status(200).json({ code });
  } catch (error: any) {
    logger.error(`Error requesting pairing code: ${error?.message || error}`);
    throw new AppError(error?.message || "ERR_REQUEST_PAIRING_CODE", 400);
  }
};

export default { store, remove, update, requestPairingCode };

