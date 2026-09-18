import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as SettingController from "../controllers/SettingController";

const upload = multer(uploadConfig);
const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, SettingController.index);
settingRoutes.get("/settings/external-products", isAuth, SettingController.getExternalProducts);
settingRoutes.get("/settings/media-proxy", isAuth, SettingController.getMediaProxy);
settingRoutes.post("/settings/logo", isAuth, upload.single("logo"), SettingController.uploadLogo);

// routes.get("/settings/:settingKey", isAuth, SettingsController.show);

// change setting key to key in future
settingRoutes.put("/settings/:settingKey", isAuth, SettingController.update);

export default settingRoutes;
