import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as ScheduledMessageController from "../controllers/ScheduledMessageController";

const scheduledMessageRoutes = express.Router();
const upload = multer(uploadConfig);

scheduledMessageRoutes.get("/scheduled-messages", isAuth, ScheduledMessageController.index);
scheduledMessageRoutes.post(
  "/scheduled-messages",
  isAuth,
  upload.single("media"),
  ScheduledMessageController.store
);
scheduledMessageRoutes.put(
  "/scheduled-messages/:id",
  isAuth,
  upload.single("media"),
  ScheduledMessageController.update
);
scheduledMessageRoutes.delete("/scheduled-messages/:id", isAuth, ScheduledMessageController.remove);

export default scheduledMessageRoutes;
