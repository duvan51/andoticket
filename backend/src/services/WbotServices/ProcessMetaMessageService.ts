import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getIO } from "../../libs/socket";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";

interface MetaMessage {
    senderId: string;
    recipientId: string;
    text: string;
    timestamp: number;
    messageId: string;
}

const ProcessMetaMessageService = async (
    channelId: number,
    message: MetaMessage
): Promise<void> => {
    const io = getIO();

    const channel = await Whatsapp.findByPk(channelId);
    if (!channel) return;

    // 1. Find or Create Contact
    const contactData = {
        name: message.senderId, // Temporary name using ID until we fetch profile
        number: message.senderId,
        profilePicUrl: "",
        isGroup: false,
        email: "",
        companyId: channel.companyId
    };

    const contact = await CreateOrUpdateContactService(contactData as any);

    // 2. Find or Create Ticket
    const ticket = await FindOrCreateTicketService(
        contact,
        channel.id,
        1, // unread messages
        channel.companyId
    );

    // 3. Create Message
    const messageData = {
        id: message.messageId,
        ticketId: ticket.id,
        contactId: contact.id,
        body: message.text,
        fromMe: false,
        read: false,
        mediaType: "chat",
        quotedMsgId: null
    };

    await ticket.update({
        lastMessage: message.text,
        lastMessageFromMe: false,
        updatedAt: new Date()
    });

    const newMessage = await CreateMessageService({ messageData });

    io.to("notification").emit("appMessage", {
        action: "create",
        message: newMessage,
        ticket: ticket,
        contact: contact
    });
};

export default ProcessMetaMessageService;
