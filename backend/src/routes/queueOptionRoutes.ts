import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as QueueOptionController from "../controllers/QueueOptionController";

const queueOptionRoutes = Router();

queueOptionRoutes.post("/queue-options", isAuth, QueueOptionController.store);

queueOptionRoutes.put("/queue-options/:optionId", isAuth, QueueOptionController.update);

queueOptionRoutes.delete("/queue-options/:optionId", isAuth, QueueOptionController.remove);

export default queueOptionRoutes;
