import path from "path";
import fs from "fs";
import AppError from "../../errors/AppError";
import MediaGallery from "../../models/MediaGallery";

interface Request {
  id: number | string;
  companyId: number;
}

const DeleteMediaGalleryService = async ({
  id,
  companyId
}: Request): Promise<void> => {
  const media = await MediaGallery.findOne({
    where: { id, companyId }
  });

  if (!media) {
    throw new AppError("ERR_MEDIA_NOT_FOUND", 404);
  }

  const filePath = path.resolve(__dirname, "..", "..", "..", "public", media.mediaUrl);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Error deleting physical file ${filePath}:`, err);
    }
  }

  await media.destroy();
};

export default DeleteMediaGalleryService;
