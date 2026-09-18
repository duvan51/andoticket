import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MediaGalleryController from "../controllers/MediaGalleryController";

const mediaGalleryRoutes = Router();
const upload = multer(uploadConfig);

mediaGalleryRoutes.get("/media-gallery", isAuth, MediaGalleryController.index);

mediaGalleryRoutes.post(
  "/media-gallery",
  isAuth,
  upload.array("files"),
  MediaGalleryController.store
);

mediaGalleryRoutes.put(
  "/media-gallery/:mediaId",
  isAuth,
  MediaGalleryController.update
);

mediaGalleryRoutes.delete(
  "/media-gallery/:mediaId",
  isAuth,
  MediaGalleryController.remove
);

mediaGalleryRoutes.post(
  "/media-gallery/send/:ticketId",
  isAuth,
  MediaGalleryController.sendToTicket
);

export default mediaGalleryRoutes;
