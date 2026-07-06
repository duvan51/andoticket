import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { logger } from "../../utils/logger";

const GetProfilePicUrl = async (number: string): Promise<string> => {
  const defaultWhatsapp = await GetDefaultWhatsApp();

  const wbot = getWbot(defaultWhatsapp.id);

  let profilePicUrl = "";
  try {
    profilePicUrl = await wbot.getProfilePicUrl(`${number}@c.us`);
  } catch (err: any) {
    logger.warn(`Could not get profile pic for ${number}. Error: ${err.message}`);
  }

  return profilePicUrl;
};

export default GetProfilePicUrl;
