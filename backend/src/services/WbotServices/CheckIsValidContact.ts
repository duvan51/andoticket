import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

const CheckIsValidContact = async (number: string, companyId?: number): Promise<void> => {
  try {
    const defaultWhatsapp = await GetDefaultWhatsApp(undefined, companyId);

    const wbot = getWbot(defaultWhatsapp.id);

    try {
      const isValidNumber = await wbot.isRegisteredUser(`${number}@c.us`);
      if (!isValidNumber) {
        throw new AppError("invalidNumber");
      }
    } catch (err) {
      if (err.message === "invalidNumber") {
        throw new AppError("ERR_WAPP_INVALID_CONTACT");
      }
      throw new AppError("ERR_WAPP_CHECK_CONTACT");
    }
  } catch (err: any) {
    if (err.message === "ERR_WAPP_NOT_INITIALIZED") {
      throw new AppError("ERR_WAPP_SESSION_NOT_INITIALIZED");
    }
    throw err;
  }
};

export default CheckIsValidContact;
