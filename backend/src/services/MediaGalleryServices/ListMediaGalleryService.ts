import { Op } from "sequelize";
import MediaGallery from "../../models/MediaGallery";
import User from "../../models/User";

interface Request {
  companyId: number;
  searchParam?: string;
  mediaType?: string;
  pageNumber?: string | number;
}

interface Response {
  records: MediaGallery[];
  count: number;
  hasMore: boolean;
}

const ListMediaGalleryService = async ({
  companyId,
  searchParam = "",
  mediaType,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 24;
  const offset = limit * (Number(pageNumber) - 1);

  const whereCondition: any = {
    companyId
  };

  if (searchParam && searchParam.trim() !== "") {
    whereCondition[Op.or] = [
      {
        title: {
          [Op.like]: `%${searchParam.trim()}%`
        }
      },
      {
        caption: {
          [Op.like]: `%${searchParam.trim()}%`
        }
      }
    ];
  }

  if (mediaType && mediaType !== "all") {
    whereCondition.mediaType = mediaType;
  }

  const { count, rows: records } = await MediaGallery.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }
    ]
  });

  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListMediaGalleryService;
