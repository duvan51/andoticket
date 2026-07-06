import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import ListCompaniesService from "../services/CompanyService/ListCompaniesService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import UpdateCompanyService from "../services/CompanyService/UpdateCompanyService";
import DeleteCompanyService from "../services/CompanyService/DeleteCompanyService";
import SignUpService from "../services/UserServices/SignUpService";

import { validate } from "../middleware/validate";
import { companySchema, companyUpdateSchema } from "../validators";

export const index = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const companies = await ListCompaniesService();

    return res.status(200).json(companies);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { name, email, password, planId, dueDate } = req.body;

    const user = await SignUpService({
        name,
        email,
        password,
        companyName: name,
        planId
    });

    // If dueDate is provided, update the company
    if (dueDate) {
        await UpdateCompanyService({ id: user.companyId, dueDate });
    }

    return res.status(200).json(user);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { id } = req.params;

    const company = await ShowCompanyService(id);

    return res.status(200).json(company);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { id } = req.params;
    const companyData = req.body;

    const company = await UpdateCompanyService({ ...companyData, id });

    return res.status(200).json(company);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { id } = req.params;

    await DeleteCompanyService(id);

    return res.status(200).json({ message: "Company deleted" });
};
