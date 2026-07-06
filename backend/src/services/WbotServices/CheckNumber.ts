import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

const CheckContactNumber = async (number: string, companyId?: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(undefined, companyId);

  const wbot = getWbot(defaultWhatsapp.id);

  const validNumber: any = await wbot.getNumberId(`${number}@c.us`);
  return validNumber.user;
};

export default CheckContactNumber;
