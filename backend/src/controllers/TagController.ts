import { Request, Response } from "express";
import CreateTagService from "../services/TagServices/CreateTagService";
import ListTagsService from "../services/TagServices/ListTagsService";
import UpdateTagService from "../services/TagServices/UpdateTagService";
import DeleteTagService from "../services/TagServices/DeleteTagService";
import SyncTicketTagsService from "../services/TagServices/SyncTicketTagsService";

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { name, color } = req.body;
    const { id: userId, companyId } = req.user;

    const tag = await CreateTagService({ name, color, userId: Number(userId), companyId });

    return res.status(200).json(tag);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { searchParam } = req.query as { searchParam: string };
    const { id: userId } = req.user;

    const tags = await ListTagsService({ searchParam, userId: Number(userId), companyId: req.user.companyId });

    return res.status(200).json(tags);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { tagId } = req.params;
    const tagData = req.body;
    const { id: userId } = req.user;

    const tag = await UpdateTagService({ tagData, tagId, userId: Number(userId) });

    return res.status(200).json(tag);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { tagId } = req.params;
    const { id: userId } = req.user;

    await DeleteTagService(tagId, Number(userId));

    return res.status(200).json({ message: "Tag deleted" });
};

export const syncTags = async (req: Request, res: Response): Promise<Response> => {
    const { ticketId } = req.params;
    const { tags } = req.body;
    const { id: userId } = req.user;

    const ticket = await SyncTicketTagsService({
        ticketId,
        tags,
        userId: Number(userId)
    });

    return res.status(200).json(ticket);
};
