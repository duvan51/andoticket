import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import CreateContactService from "./CreateContactService";
import { Op } from "sequelize";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  companyId?: number;
}

const GetContactService = async ({
  name,
  number,
  companyId
}: Request): Promise<Contact> => {
  let numberExists: Contact | null = null;
  if (number && number.length >= 10) {
    const suffix = number.slice(-10);
    numberExists = await Contact.findOne({
      where: {
        ...(companyId && { companyId }),
        number: {
          [Op.or]: [
            number,
            { [Op.like]: `%${suffix}` }
          ]
        }
      }
    });
    if (numberExists && numberExists.number !== number) {
      await numberExists.update({ number });
    }
  } else {
    numberExists = await Contact.findOne({
      where: { number, ...(companyId && { companyId }) }
    });
  }

  if (!numberExists) {
    const contact = await CreateContactService({
      name,
      number,
      companyId: companyId || 1
    });

    if (contact == null) throw new AppError("CONTACT_NOT_FIND");
    else return contact;
  }

  return numberExists;
};

export default GetContactService;
