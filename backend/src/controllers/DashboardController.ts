import { Request, Response } from "express";
import { Op, fn, col } from "sequelize";
import TicketTracking from "../models/TicketTracking";
import Ticket from "../models/Ticket";
import User from "../models/User";
import UserSessionLog from "../models/UserSessionLog";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { companyId } = req.user;
        const { userId, startDate, endDate } = req.query;

        // Construir filtro de fecha base
        const dateFilter: any = {};
        if (startDate || endDate) {
            dateFilter[Op.and] = [];
            if (startDate) {
                dateFilter[Op.and].push({ [Op.gte]: new Date(startDate as string) });
            }
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                dateFilter[Op.and].push({ [Op.lte]: end });
            }
        }

        // 1. Leads aceptados por usuario (aislado por empresa)
        const leadsByUserWhere: any = {};
        if (userId) {
            leadsByUserWhere.userId = userId;
        } else {
            leadsByUserWhere.userId = { [Op.ne]: null as any };
        }

        if (dateFilter[Op.and]) {
            leadsByUserWhere.createdAt = dateFilter;
        }

        const leadsByUser = await TicketTracking.findAll({
            attributes: [
                "userId",
                [fn("COUNT", col("TicketTracking.id")), "count"]
            ],
            where: leadsByUserWhere,
            include: [{
                model: User,
                attributes: ["name"],
                where: { companyId } // Aislamiento multi-tenant
            }],
            group: ["userId", "User.id", "User.name"]
        });

        // 2. Nuevos leads en los últimos 7 días o rango filtrado (aislado por empresa)
        const ticketsWhere: any = { companyId };
        if (userId) {
            ticketsWhere.userId = userId;
        }

        if (dateFilter[Op.and]) {
            ticketsWhere.createdAt = dateFilter;
        } else {
            const date7DaysAgo = new Date();
            date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
            ticketsWhere.createdAt = { [Op.gte]: date7DaysAgo };
        }

        const newLeads = await Ticket.findAll({
            attributes: [
                [fn("DATE", col("createdAt")), "date"],
                [fn("COUNT", col("id")), "count"]
            ],
            where: ticketsWhere,
            group: [fn("DATE", col("createdAt"))],
            order: [[fn("DATE", col("createdAt")), "ASC"]]
        });

        // 3. Tiempos de sesión de usuario (aislado por empresa)
        const sessionsWhere: any = {
            logoutAt: { [Op.ne]: null as any }
        };

        if (dateFilter[Op.and]) {
            sessionsWhere.loginAt = dateFilter;
        }

        const userWhere: any = { companyId };
        if (userId) {
            userWhere.id = userId;
        }

        const sessions = await UserSessionLog.findAll({
            include: [{
                model: User,
                attributes: ["name", "email"],
                where: userWhere // Aislamiento multi-tenant y filtro por usuario
            }],
            where: sessionsWhere
        });

        const userTimes: Record<string, { name: string, seconds: number }> = {};
        sessions.forEach(session => {
            const userObj = session.user;
            if (!userObj) return;

            if (!userTimes[userObj.id]) {
                userTimes[userObj.id] = { name: userObj.name, seconds: 0 };
            }
            const duration = (new Date(session.logoutAt).getTime() - new Date(session.loginAt).getTime()) / 1000;
            userTimes[userObj.id].seconds += duration;
        });

        // 4. Obtener listado de usuarios de la empresa para poblar dropdown de filtros en frontend
        const companyUsers = await User.findAll({
            where: { companyId },
            attributes: ["id", "name"]
        });

        return res.json({
            leadsByUser,
            newLeads,
            userTimes,
            companyUsers
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
};
