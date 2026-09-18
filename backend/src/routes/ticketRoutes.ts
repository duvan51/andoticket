import express from "express";
import isAuth from "../middleware/isAuth";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get("/tickets", isAuth, TicketController.index);

ticketRoutes.put("/tickets/bulk", isAuth, TicketController.bulkUpdate);
ticketRoutes.delete("/tickets/bulk", isAuth, TicketController.bulkDelete);

ticketRoutes.get("/tickets/:ticketId", isAuth, TicketController.show);

ticketRoutes.post("/tickets", isAuth, TicketController.store);

ticketRoutes.post("/tickets/internal", isAuth, TicketController.createInternalTicket);

ticketRoutes.post("/tickets/internal/group", isAuth, TicketController.createInternalGroupTicket);

ticketRoutes.put("/tickets/:ticketId", isAuth, TicketController.update);

ticketRoutes.delete("/tickets/:ticketId", isAuth, TicketController.remove);

ticketRoutes.delete("/tickets/:ticketId/clean", isAuth, TicketController.clean);

ticketRoutes.post("/tickets/:ticketId/reset-flow", isAuth, TicketController.resetFlow);

ticketRoutes.post("/tickets/:ticketId/exit-flow", isAuth, TicketController.exitFlow);

export default ticketRoutes;
