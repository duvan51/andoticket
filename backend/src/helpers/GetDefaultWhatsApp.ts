import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import GetDefaultWhatsAppByUser from "./GetDefaultWhatsAppByUser";

const GetDefaultWhatsApp = async (userId?: number, companyId?: number): Promise<Whatsapp> => {
  if (userId) {
    const whatsappByUser = await GetDefaultWhatsAppByUser(userId);
    if (whatsappByUser !== null) {
      return whatsappByUser;
    }
  }

  let whereCondition: any = { 
    isDefault: true,
    status: { [Op.in]: ["CONNECTED", "OPENING"] }
  };
  
  if (companyId) {
    whereCondition.companyId = companyId;
  }

  let defaultWhatsapp = await Whatsapp.findOne({
    where: whereCondition
  });

  // If no default found, try any CONNECTED or OPENING whatsapp
  if (!defaultWhatsapp) {
    whereCondition = { status: { [Op.in]: ["CONNECTED", "OPENING"] } };
    if (companyId) {
      whereCondition.companyId = companyId;
    }
    defaultWhatsapp = await Whatsapp.findOne({
      where: whereCondition
    });
  }

  if (!defaultWhatsapp) {
    throw new AppError("ERR_NO_DEF_WAPP_FOUND");
  }

  return defaultWhatsapp;
};

export default GetDefaultWhatsApp;
