import Tag from "../../models/Tag";

interface Request {
    name: string;
    color?: string;
    userId: number;
    companyId: number;
}

const CreateTagService = async ({ name, color, userId, companyId }: Request): Promise<Tag> => {
    const tag = await Tag.create({ name, color, userId, companyId });
    return tag;
};

export default CreateTagService;
