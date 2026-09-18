import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
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
  companyId: number;
}

const CreateContactService = async ({
  name,
  number,
  email = "",
  extraInfo = [],
  profilePicUrl,
  companyId
}: Request): Promise<Contact> => {
  let numberExists: Contact | null = null;
  if (number && number.length >= 10) {
    const suffix = number.slice(-10);
    numberExists = await Contact.findOne({
      where: {
        companyId,
        number: {
          [Op.or]: [
            number,
            { [Op.like]: `%${suffix}` }
          ]
        }
      }
    });
  } else {
    numberExists = await Contact.findOne({
      where: { number, companyId }
    });
  }

  if (numberExists) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  const contact = await Contact.create(
    {
      name,
      number,
      email,
      extraInfo,
      profilePicUrl,
      companyId
    },
    {
      include: ["extraInfo"]
    }
  );

  return contact;
};

export default CreateContactService;
