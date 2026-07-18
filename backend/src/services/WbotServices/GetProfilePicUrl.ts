import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { logger } from "../../utils/logger";
import { getJid } from "../../helpers/GetJid";

const GetProfilePicUrl = async (number: string): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp();

  const wbot = getWbot(defaultWhatsapp.id);

  let profilePicUrl = "";
  try {
    profilePicUrl = await wbot.getProfilePicUrl(getJid(number));
  } catch (err: any) {
    logger.warn(`Could not get profile pic for ${number}. Error: ${err.message}`);
  }

  return profilePicUrl;
};

export default GetProfilePicUrl;
