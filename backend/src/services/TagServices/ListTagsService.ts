import Tag from "../../models/Tag";
import User from "../../models/User";
import { Op } from "sequelize";

interface Request {
    searchParam?: string;
    userId?: string | number;
    companyId?: number;
}

const ListTagsService = async ({
    searchParam,
    userId,
    companyId
}: Request): Promise<Tag[]> => {
    let whereCondition: any = {};

    if (!companyId) {
        throw new Error("ERR_NO_COMPANY_ID");
    }

    whereCondition.companyId = companyId;

    if (searchParam) {
        whereCondition.name = {
            [Op.like]: `%${searchParam}%`
        };
    }

    const orConditions: any[] = [
        { "$user.profile$": ["admin", "superadmin"] }
    ];

    if (userId) {
        orConditions.push({ userId });
    }

    const tags = await Tag.findAll({
        where: {
            ...whereCondition,
            [Op.or]: orConditions
        },
        include: [{
            model: User,
            as: "user",
            attributes: ["profile"]
        }],
        order: [["name", "ASC"]]
    });

    return tags;
};

export default ListTagsService;
