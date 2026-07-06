import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";

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
  let contact: Contact | null;

  try {
    // Usar findOrCreate para evitar race conditions
    const [contactRecord, created] = await Contact.findOrCreate({
      where: { number, companyId },
      defaults: {
        name,
        number,
        profilePicUrl,
        email,
        isGroup,
        extraInfo,
        companyId
      }
    });

    contact = contactRecord;

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
    contact = await Contact.findOne({ where: { number, companyId } });
    if (!contact) {
      throw error;
    }
  }

  return contact;
};

export default CreateOrUpdateContactService;
