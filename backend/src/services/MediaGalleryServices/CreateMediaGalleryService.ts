import path from "path";
import MediaGallery from "../../models/MediaGallery";

interface Request {
  files: Express.Multer.File[];
  title?: string;
  caption?: string;
  companyId: number;
  userId: number;
}

const getMediaType = (mimetype: string, filename: string): string => {
  if (mimetype) {
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    if (mimetype.startsWith("audio/")) return "audio";
  }
  const ext = path.extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp"].includes(ext)) return "video";
  if ([".mp3", ".ogg", ".wav", ".m4a", ".aac", ".opus"].includes(ext)) return "audio";
  return "document";
};

const CreateMediaGalleryService = async ({
  files,
  title,
  caption,
  companyId,
  userId
}: Request): Promise<MediaGallery[]> => {
  const createdRecords: MediaGallery[] = [];

  for (const file of files) {
    const inferredType = getMediaType(file.mimetype, file.filename);
    const itemTitle = title || file.originalname || file.filename;

    const mediaRecord = await MediaGallery.create({
      title: itemTitle,
      caption: caption || "",
      mediaUrl: file.filename,
      mediaType: inferredType,
      mimeType: file.mimetype,
      size: file.size,
      companyId,
      userId
    });

    createdRecords.push(mediaRecord);
  }

  return createdRecords;
};

export default CreateMediaGalleryService;
