import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import { Op } from "sequelize";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  companyId: number;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  companyId
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  const io = getIO();
  let contact: Contact | null = null;

  try {
    let created = false;
    if (!isGroup && number && number.length >= 10) {
      const suffix = number.slice(-10);
      contact = await Contact.findOne({
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
      if (contact && contact.number !== number) {
        await contact.update({ number });
      }
    } else {
      contact = await Contact.findOne({
        where: { number, companyId }
      });
    }

    if (!contact) {
      contact = await Contact.create({
        name,
        number,
        profilePicUrl,
        email,
        isGroup,
        extraInfo,
        companyId
      });
      created = true;
    }

    if (created) {
      io.emit("contact", {
        action: "create",
        contact
      });
    } else {
      // Si ya existía, actualizar profilePicUrl si es diferente
      if (profilePicUrl && contact.profilePicUrl !== profilePicUrl) {
        await contact.update({ profilePicUrl });
      }

      io.emit("contact", {
        action: "update",
        contact
      });
    }
  } catch (error: any) {
    // En caso de cualquier otro error, intentar encontrar el contacto
    if (!isGroup && number && number.length >= 10) {
      const suffix = number.slice(-10);
      contact = await Contact.findOne({
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
      contact = await Contact.findOne({ where: { number, companyId } });
    }
    if (!contact) {
      throw error;
    }
  }

  return contact;
};

export default CreateOrUpdateContactService;
