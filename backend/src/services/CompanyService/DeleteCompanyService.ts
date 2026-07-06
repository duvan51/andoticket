import Company from "../../models/Company";
import AppError from "../../errors/AppError";
import User from "../../models/User";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Setting from "../../models/Setting";
import QuickAnswer from "../../models/QuickAnswer";
import Tag from "../../models/Tag";

const DeleteCompanyService = async (id: string | number): Promise<void> => {
    const company = await Company.findOne({
        where: { id }
    });

    if (!company) {
        throw new AppError("ERR_NO_COMPANY_FOUND", 404);
    }

    // Cascading deletion
    await Tag.destroy({ where: { companyId: id } });
    await QuickAnswer.destroy({ where: { companyId: id } });
    await Setting.destroy({ where: { companyId: id } });
    await Queue.destroy({ where: { companyId: id } });
    await Message.destroy({ where: { companyId: id } });
    await Whatsapp.destroy({ where: { companyId: id } });
    await Contact.destroy({ where: { companyId: id } });
    await Ticket.destroy({ where: { companyId: id } });
    await User.destroy({ where: { companyId: id } });

    await company.destroy();
};

export default DeleteCompanyService;
