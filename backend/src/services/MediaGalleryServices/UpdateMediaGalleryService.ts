import AppError from "../../errors/AppError";
import MediaGallery from "../../models/MediaGallery";

interface Request {
  id: number | string;
  title: string;
  caption?: string;
  companyId: number;
}

const UpdateMediaGalleryService = async ({
  id,
  title,
  caption,
  companyId
}: Request): Promise<MediaGallery> => {
  const media = await MediaGallery.findOne({
    where: { id, companyId }
  });

  if (!media) {
    throw new AppError("ERR_MEDIA_NOT_FOUND", 404);
  }

  await media.update({
    title,
    caption: caption !== undefined ? caption : media.caption
  });

  return media;
};

export default UpdateMediaGalleryService;
