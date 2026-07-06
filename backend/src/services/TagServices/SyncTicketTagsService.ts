import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import User from "../../models/User";
import Message from "../../models/Message";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";

interface Request {
    ticketId: number | string;
    tags: Tag[];
    userId: number | string;
}

const SyncTicketTagsService = async ({
    ticketId,
    tags,
    userId
}: Request): Promise<Ticket> => {
    const ticket = await Ticket.findByPk(ticketId, {
        include: [{
            model: Tag,
            as: "tags",
            include: [{ model: User, as: "user", attributes: ["profile"] }]
        }]
    });

    if (!ticket) {
        throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }

    const currentUsersTags = ticket.tags.filter(tag => 
        tag.userId === Number(userId) || 
        (tag.user && (tag.user.profile === "admin" || tag.user.profile === "superadmin"))
    );
    const addedTags = tags.filter(tag => !currentUsersTags.some(t => t.id === tag.id));
    const removedTags = currentUsersTags.filter(tag => !tags.some(t => t.id === tag.id));

    const otherUsersTags = ticket.tags.filter(tag => 
        tag.userId !== Number(userId) && 
        !(tag.user && (tag.user.profile === "admin" || tag.user.profile === "superadmin"))
    );
    const newTagsList = [...otherUsersTags, ...tags];

    await ticket.$set("tags", newTagsList.map(t => t.id));

    const io = getIO();

    for (const tag of addedTags) {
        const randomId = Math.random().toString(36).substring(2, 15);
        const message = await Message.create({
            id: `note-${randomId}`,
            ticketId: ticket.id,
            contactId: ticket.contactId,
            body: `Etiqueta agregada: "${tag.name}"`,
            fromMe: true,
            read: true,
            mediaType: "tag",
            companyId: ticket.companyId
        });

        io.to(ticket.id.toString())
          .to(`company-${ticket.companyId}-open`)
          .to(`company-${ticket.companyId}-notification`)
          .emit("appMessage", {
            action: "create",
            message
          });
    }

    for (const tag of removedTags) {
        const randomId = Math.random().toString(36).substring(2, 15);
        const message = await Message.create({
            id: `note-${randomId}`,
            ticketId: ticket.id,
            contactId: ticket.contactId,
            body: `Etiqueta eliminada: "${tag.name}"`,
            fromMe: true,
            read: true,
            mediaType: "tag",
            companyId: ticket.companyId
        });

        io.to(ticket.id.toString())
          .to(`company-${ticket.companyId}-open`)
          .to(`company-${ticket.companyId}-notification`)
          .emit("appMessage", {
            action: "create",
            message
          });
    }

    return ticket;
};

export default SyncTicketTagsService;
