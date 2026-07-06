import * as Yup from "yup";
import Company from "../../models/Company";
import AppError from "../../errors/AppError";

interface CompanyData {
    name?: string;
    id?: number;
    phone?: string;
    email?: string;
    status?: boolean;
    planId?: number;
    dueDate?: string;
}

const UpdateCompanyService = async (companyData: CompanyData): Promise<Company> => {
    const schema = Yup.object().shape({
        name: Yup.string()
    });

    const { id, name, phone, email, status, planId, dueDate } = companyData;

    try {
        await schema.validate({ name });
    } catch (err) {
        throw new AppError(err.message);
    }

    const company = await Company.findByPk(id);

    if (!company) {
        throw new AppError("ERR_NO_COMPANY_FOUND", 404);
    }

    await company.update({
        name,
        phone,
        email,
        status,
        planId,
        dueDate
    });

    return company;
};

export default UpdateCompanyService;
