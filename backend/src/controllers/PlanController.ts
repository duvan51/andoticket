import { Request, Response } from "express";
import CreatePlanService from "../services/PlanServices/CreatePlanService";
import ListPlansService from "../services/PlanServices/ListPlansService";
import UpdatePlanService from "../services/PlanServices/UpdatePlanService";
import DeletePlanService from "../services/PlanServices/DeletePlanService";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const plans = await ListPlansService();

    return res.status(200).json(plans);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { name, users, whatsapps, queues, value } = req.body;

    const plan = await CreatePlanService({
        name,
        users,
        whatsapps,
        queues,
        value
    });

    return res.status(200).json(plan);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { planId } = req.params;
    const planData = req.body;

    const plan = await UpdatePlanService({ planData, planId });

    return res.status(200).json(plan);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "admin" || req.user.companyId !== 1) {
        throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { planId } = req.params;

    await DeletePlanService(planId);

    return res.status(200).json({ message: "Plan deleted" });
};
