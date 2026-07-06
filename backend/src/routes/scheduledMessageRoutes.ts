import express from "express";
import isAuth from "../middleware/isAuth";
import * as ScheduledMessageController from "../controllers/ScheduledMessageController";

const scheduledMessageRoutes = express.Router();

scheduledMessageRoutes.get("/scheduled-messages", isAuth, ScheduledMessageController.index);
scheduledMessageRoutes.post("/scheduled-messages", isAuth, ScheduledMessageController.store);
scheduledMessageRoutes.put("/scheduled-messages/:id", isAuth, ScheduledMessageController.update);
scheduledMessageRoutes.delete("/scheduled-messages/:id", isAuth, ScheduledMessageController.remove);

export default scheduledMessageRoutes;
