import { join } from "path";
import { promisify } from "util";
import fs, { writeFile } from "fs";
import * as Sentry from "@sentry/node";

import {
  Contact as WbotContact,
  Message as WbotMessage,
  MessageAck,
  Client,
  MessageMedia
} from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import QueueOption from "../../models/QueueOption";
import Queue from "../../models/Queue";
import Setting from "../../models/Setting";

import { getIO } from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { debounce } from "../../helpers/Debounce";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import CreateContactService from "../ContactServices/CreateContactService";
import GetContactService from "../ContactServices/GetContactService";
import formatBody from "../../helpers/Mustache";
import { convertToMp3 } from "../../helpers/ConvertAudio";
import { getJid } from "../../helpers/GetJid";

interface Session extends Client {
  id?: number;
}

const getTargetJid = (ticket: Ticket, contact: Contact): string => {
  return ticket.isGroup ? `${contact.number}@g.us` : getJid(contact.number);
};

const writeFileAsync = promisify(writeFile);

const verifyContact = async (msgContact: WbotContact, companyId: number): Promise<Contact> => {
  let profilePicUrl = "";
  try {
    profilePicUrl = await msgContact.getProfilePicUrl();
  } catch (err: any) {
    logger.warn(`Could not get profile pic for contact ${msgContact.id.user}. Error: ${err.message}`);
  }

  const contactData = {
    name: msgContact.name || msgContact.pushname || msgContact.id.user,
    number: msgContact.id.user,
    profilePicUrl,
    isGroup: msgContact.isGroup,
    companyId
  };

  const contact = await CreateOrUpdateContactService(contactData);

  return contact;
};

const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  if (!msg.hasQuotedMsg) return null;

  try {
    const wbotQuotedMsg = await msg.getQuotedMessage();
    if (!wbotQuotedMsg) return null;

    let quotedMsg = await Message.findOne({
      where: { id: wbotQuotedMsg.id.id },
      include: ["contact"]
    });

    if (!quotedMsg && wbotQuotedMsg.id && wbotQuotedMsg.id.id) {
      try {
        const isAudioQuoted =
          wbotQuotedMsg.type === "audio" || wbotQuotedMsg.type === "ptt";
        quotedMsg = await Message.create({
          id: wbotQuotedMsg.id.id,
          ticketId: 0,
          body: wbotQuotedMsg.body || (wbotQuotedMsg.hasMedia ? "[Archivo multimedia]" : ""),
          fromMe: wbotQuotedMsg.fromMe || false,
          read: true,
          mediaType: isAudioQuoted ? "audio" : (wbotQuotedMsg.type || "chat"),
        });
      } catch (e) {
        // Ignore duplicate insert errors
      }
    }

    return quotedMsg;
  } catch (err) {
    logger.warn(`Could not get quoted message: ${err}`);
    return null;
  }
};

// generate random id string for file names, function got from: https://stackoverflow.com/a/1349426/1851801
function makeRandomId(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

const extractAdReply = async (msg: WbotMessage): Promise<string | null> => {
  try {
    const raw = (msg as any)._data || (msg as any).rawData || (msg as any);
    const contextInfo = raw.contextInfo || (msg as any).contextInfo;
    const externalAdReply = contextInfo?.externalAdReply;
    const ctwaContext = raw.ctwaContext || (msg as any).ctwaContext;
    const referral = raw.referral || (msg as any).referral;
    const quotedAd = raw.quotedMsg?.externalAdReply || (raw.quotedMsg?.type === "ad" ? raw.quotedMsg : null);

    const source = externalAdReply || ctwaContext || referral || quotedAd;
    if (!source) return null;

    const title = source.title || source.headline || "";
    const body = source.body || source.description || "";
    const sourceUrl = source.sourceUrl || source.source_url || "";
    const sourceId = source.sourceId || source.source_id || "";
    const sourceType = source.sourceType || source.source_type || "ad";

    let thumbnailUrl = source.thumbnailUrl || source.thumbnail_url || source.mediaUrl || "";
    let thumbnailBase64 = source.thumbnail || source.jpegThumbnail || "";

    if (thumbnailBase64) {
      try {
        let cleanBase64 = "";
        if (typeof thumbnailBase64 === "string") {
          cleanBase64 = thumbnailBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        } else if (Buffer.isBuffer(thumbnailBase64)) {
          cleanBase64 = thumbnailBase64.toString("base64");
        }

        if (cleanBase64) {
          const randomId = makeRandomId(6);
          const filename = `ad_thumb_${new Date().getTime()}_${randomId}.jpg`;
          const filePath = join(__dirname, "..", "..", "..", "public", filename);
          await writeFileAsync(filePath, cleanBase64, "base64");
          thumbnailUrl = filename;
        }
      } catch (err) {
        logger.warn(`Could not save ad thumbnail image: ${err}`);
      }
    }

    if (!title && !body && !thumbnailUrl && !sourceUrl) {
      return null;
    }

    logger.info(`Detected Ad reply on message ${msg.id?.id}: title="${title}", sourceUrl="${sourceUrl}", hasThumbnail=${Boolean(thumbnailUrl)}`);

    return JSON.stringify({
      title,
      body,
      sourceUrl,
      sourceId,
      sourceType,
      thumbnailUrl
    });
  } catch (err) {
    logger.warn(`Error extracting adReply: ${err}`);
    return null;
  }
};

const verifyMediaMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);

  let media: MessageMedia | null = null;
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      media = await msg.downloadMedia();
      if (media && (media.data || media.filename)) {
        break;
      }
    } catch (err) {
      logger.warn(`Attempt ${attempt}/${maxAttempts} downloading media for msg ${msg.id.id}: ${err}`);
    }

    if (!media && attempt < maxAttempts) {
      // Exponential backoff to wait for WhatsApp Web to resolve the media stage
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  let filename = msg.body;

  if (!media) {
    if (msg.fromMe && filename) {
      const existingPath = join(__dirname, "..", "..", "..", "public", filename);
      if (fs.existsSync(existingPath)) {
        const ext = filename.split(".").pop() || "ogg";
        media = {
          mimetype: ext === "mp3" ? "audio/mp3" : "audio/ogg",
          data: "",
          filename
        };
      }
    }
    if (!media) {
      logger.warn(`Failed to download media for msg ${msg.id.id} after ${maxAttempts} attempts. Saving as fallback text message.`);
      msg.body = `[Archivo multimedia - No se pudo descargar]`;
      const fallbackMsg = await verifyMessage(msg, ticket, contact);
      return fallbackMsg;
    }
  }

  let randomId = makeRandomId(5);

  if (!media.filename) {
    const ext = media.mimetype ? media.mimetype.split("/")[1].split(";")[0] : "ogg";
    media.filename = `${randomId}-${new Date().getTime()}.${ext}`;
  } else if (!msg.fromMe || !fs.existsSync(join(__dirname, "..", "..", "..", "public", media.filename))) {
    media.filename =
      media.filename.split(".").slice(0, -1).join(".") +
      "." +
      randomId +
      "." +
      media.filename.split(".").slice(-1);
  }

  const filePath = join(__dirname, "..", "..", "..", "public", media.filename);

  try {
    if (media.data) {
      await writeFileAsync(filePath, media.data, "base64");
    }

    const isAudio =
      (media.mimetype && (media.mimetype.startsWith("audio/") || media.mimetype.includes("ogg"))) ||
      msg.type === "audio" ||
      msg.type === "ptt";

    if (isAudio) {
      try {
        const mp3Path = await convertToMp3(filePath);
        if (mp3Path && mp3Path !== filePath) {
          media.filename = mp3Path.split("/").pop() || media.filename;
        }
      } catch (err) {
        logger.error(`Error converting incoming audio to mp3: ${err}`);
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }

  const isAudioMsg =
    (media.mimetype && (media.mimetype.startsWith("audio/") || media.mimetype.includes("ogg"))) ||
    msg.type === "audio" ||
    msg.type === "ptt";

  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body || media.filename,
    fromMe: msg.fromMe,
    read: msg.fromMe,
    mediaUrl: media.filename,
    mediaType: isAudioMsg ? "audio" : (media.mimetype ? media.mimetype.split("/")[0] : msg.type),
    quotedMsgId: quotedMsg?.id,
    isForwarded: Boolean((msg as any).isForwarded),
    forwardingScore: Number((msg as any).forwardingScore || 0),
    adReply: await extractAdReply(msg)
  };

  await ticket.update({
    lastMessage: msg.body || media.filename,
    lastMessageFromMe: msg.fromMe
  });
  const newMessage = await CreateMessageService({ messageData });

  return newMessage;
};

const verifyMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  if (msg.type === "location") msg = prepareLocation(msg);

  const quotedMsg = await verifyQuotedMessage(msg);
  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body,
    fromMe: msg.fromMe,
    mediaType: msg.type,
    read: msg.fromMe,
    quotedMsgId: quotedMsg?.id,
    isForwarded: Boolean((msg as any).isForwarded),
    forwardingScore: Number((msg as any).forwardingScore || 0),
    adReply: await extractAdReply(msg)
  };

  // temporaryly disable ts checks because of type definition bug for Location object
  // @ts-ignore
  await ticket.update({
    lastMessage:
      msg.type === "location"
        ? msg.location.description
          ? "Localization - " + msg.location.description.split("\\n")[0]
          : "Localization"
        : msg.body,
    lastMessageFromMe: msg.fromMe
  });

  const newMessage = await CreateMessageService({ messageData });
  return newMessage;
};

const prepareLocation = (msg: WbotMessage): WbotMessage => {
  let gmapsUrl =
    "https://maps.google.com/maps?q=" +
    msg.location.latitude +
    "%2C" +
    msg.location.longitude +
    "&z=17&hl=pt-BR";

  msg.body = "data:image/png;base64," + msg.body + "|" + gmapsUrl;

  // temporaryly disable ts checks because of type definition bug for Location object
  // @ts-ignore
  msg.body +=
    "|" +
    (msg.location.description
      ? msg.location.description
      : msg.location.latitude + ", " + msg.location.longitude);

  return msg;
};

const verifyQueue = async (
  wbot: Session,
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!);

  if (queues.length === 1) {
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id },
      ticketId: ticket.id
    });

    const queueGreeting = queues[0].greetingMessage || greetingMessage || "";
    if (queueGreeting) {
      const body = formatBody(`\u200e${queueGreeting}`, contact);
      const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
      await verifyMessage(sentMessage, ticket, contact);
    }

    const rootOptions = await QueueOption.findAll({
      where: {
        queueId: queues[0].id,
        parentId: null
      }
    });

    if (rootOptions.length > 0) {
      let optionsText = "";
      rootOptions.forEach(opt => {
        optionsText += `*${opt.option}* - ${opt.title}\n`;
      });
      const optionsBody = formatBody(`\u200e${optionsText}`, contact);
      const sentMenuMessage = await wbot.sendMessage(getTargetJid(ticket, contact), optionsBody);
      await verifyMessage(sentMenuMessage, ticket, contact);
    }

    return;
  }

  const cleanOption = (msg.body || "").trim();
  const isNumeric = /^\d+$/.test(cleanOption);
  const selectedIndex = isNumeric ? parseInt(cleanOption, 10) - 1 : -1;

  const choosenQueue = selectedIndex >= 0 && selectedIndex < queues.length ? queues[selectedIndex] : null;

  if (choosenQueue) {
    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id
    });

    if (choosenQueue.greetingMessage) {
      const body = formatBody(`\u200e${choosenQueue.greetingMessage}`, contact);
      const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
      await verifyMessage(sentMessage, ticket, contact);
    }

    const rootOptions = await QueueOption.findAll({
      where: {
        queueId: choosenQueue.id,
        parentId: null
      }
    });

    if (rootOptions.length > 0) {
      let optionsText = "";
      rootOptions.forEach(opt => {
        optionsText += `*${opt.option}* - ${opt.title}\n`;
      });
      const optionsBody = formatBody(`\u200e${optionsText}`, contact);
      const sentMenuMessage = await wbot.sendMessage(getTargetJid(ticket, contact), optionsBody);
      await verifyMessage(sentMenuMessage, ticket, contact);
    }
  } else {
    let options = "";

    queues.forEach((queue, index) => {
      options += `*${index + 1}* - ${queue.name}\n`;
    });

    let prefix = "";
    if (ticket.lastMessageFromMe) {
      prefix = isNumeric
        ? `⚠️ *Número de opción no válido.* Por favor responde con un número del 1 al ${queues.length}:\n\n`
        : `⚠️ *Por favor responde únicamente con el número de la opción deseada:*\n\n`;
    }

    const greeting = greetingMessage ? `${greetingMessage}\n\n` : "¡Hola! Por favor selecciona una opción para continuar:\n\n";
    const body = formatBody(`\u200e${prefix}${prefix ? "" : greeting}${options}`, contact);

    const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
    await verifyMessage(sentMessage, ticket, contact);
  }
};

const verifyQueueOption = async (
  wbot: Session,
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  const selectedOption = (msg.body || "").trim();
  const { queueId, currentOptionId } = ticket;

  const normalized = selectedOption.toLowerCase();
  if (normalized === "#" || normalized === "0" || normalized === "menu" || normalized === "menú" || normalized === "inicio" || normalized === "reiniciar") {
    await ticket.update({ currentOptionId: null });
    const rootOptions = await QueueOption.findAll({
      where: {
        queueId,
        parentId: null
      }
    });

    if (rootOptions.length > 0) {
      let optionsText = "*Menú Principal*\n\n";
      rootOptions.forEach(opt => {
        optionsText += `*${opt.option}* - ${opt.title}\n`;
      });
      const childBody = formatBody(`\u200e${optionsText}`, contact);
      const sentMenuMessage = await wbot.sendMessage(getTargetJid(ticket, contact), childBody);
      await verifyMessage(sentMenuMessage, ticket, contact);
    }
    return;
  }

  const options = await QueueOption.findAll({
    where: {
      queueId,
      parentId: currentOptionId || null
    }
  });

  if (options.length === 0) {
    const queue = await Queue.findByPk(queueId);
    if (queue?.greetingMessage && !currentOptionId && !ticket.lastMessageFromMe) {
      const body = formatBody(`\u200e${queue.greetingMessage}`, contact);
      const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
      await verifyMessage(sentMessage, ticket, contact);
    }
    return;
  }

  const choosenOption = options.find(
    o => o.option.toLowerCase() === selectedOption.toLowerCase()
  );

  if (choosenOption) {
    await ticket.update({ currentOptionId: choosenOption.id });

    if (choosenOption.message) {
      const body = formatBody(`\u200e${choosenOption.message}`, contact);
      const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
      await verifyMessage(sentMessage, ticket, contact);
    }

    const childOptions = await QueueOption.findAll({
      where: {
        queueId,
        parentId: choosenOption.id
      }
    });

    if (childOptions.length > 0) {
      let optionsText = "";
      childOptions.forEach(opt => {
        optionsText += `*${opt.option}* - ${opt.title}\n`;
      });
      const childBody = formatBody(`\u200e${optionsText}\n_(Escribe *#* o *0* para volver al menú principal)_`, contact);
      const sentMenuMessage = await wbot.sendMessage(getTargetJid(ticket, contact), childBody);
      await verifyMessage(sentMenuMessage, ticket, contact);
    }
  } else {
    let optionsText = "";
    options.forEach(opt => {
      optionsText += `*${opt.option}* - ${opt.title}\n`;
    });

    const isNumeric = /^\d+$/.test(selectedOption);
    const queue = await Queue.findByPk(queueId);

    let bodyText = "";
    if (!currentOptionId && !ticket.lastMessageFromMe && queue?.greetingMessage) {
      bodyText = `${queue.greetingMessage}\n\n${optionsText}\n_(Escribe *#* o *0* para volver al menú principal)_`;
    } else {
      const warningText = isNumeric
        ? `⚠️ *Número de opción no válido.* Por favor elige una de las opciones disponibles:\n\n`
        : `⚠️ *Por favor responde únicamente con el número de la opción deseada:*\n\n`;
      bodyText = `${warningText}${optionsText}\n_(Escribe *#* o *0* para volver al menú principal)_`;
    }

    const body = formatBody(`\u200e${bodyText}`, contact);
    const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
    await verifyMessage(sentMessage, ticket, contact);
  }
};

const isValidMsg = (msg: WbotMessage): boolean => {
  if (msg.from === "status@broadcast") return false;
  if (
    msg.type === "chat" ||
    msg.type === "audio" ||
    msg.type === "ptt" ||
    msg.type === "video" ||
    msg.type === "image" ||
    msg.type === "document" ||
    msg.type === "vcard" ||
    msg.type === "multi_vcard" ||
    msg.type === "sticker" ||
    msg.type === "location" ||
    msg.type === "buttons_response" ||
    msg.type === "template_button_reply" ||
    msg.type === "list_response" ||
    msg.type === "interactive"
  )
    return true;
  return false;
};

const handleMessage = async (
  msg: WbotMessage,
  wbot: Session
): Promise<void> => {
  if (!isValidMsg(msg)) {
    return;
  }

  try {
    const messageExists = await Message.findByPk(msg.id.id);
    if (messageExists) {
      return;
    }

    let msgContact: WbotContact;
    let groupContact: Contact | undefined;

    try {
      if (msg.fromMe) {
        // messages sent automatically by wbot have a special character in front of it
        // if so, this message was already been stored in database;
        if (/\u200e/.test(msg.body[0])) return;

        // media messages sent from me from cell phone, first comes with "hasMedia = false" and type = "image/ptt/etc"
        // in this case, return and let this message be handled by "media_uploaded" event, when it will have "hasMedia = true"

        if (
          !msg.hasMedia &&
          msg.type !== "location" &&
          msg.type !== "chat" &&
          msg.type !== "vcard" &&
          msg.type !== "ptt" &&
          msg.type !== "audio"
        )
          return;

        msgContact = await wbot.getContactById(msg.to);
      } else {
        msgContact = await msg.getContact();
      }
    } catch (err) {
      logger.error(`Error getting contact for message: ${err}`);
      const contactNumber = msg.fromMe ? msg.to.replace("@c.us", "").replace("@g.us", "") : msg.from.replace("@c.us", "").replace("@g.us", "");
      msgContact = {
        id: { _serialized: msg.fromMe ? msg.to : msg.from, user: contactNumber },
        number: contactNumber,
        name: contactNumber,
        isGroup: msg.from.endsWith("@g.us") || msg.to.endsWith("@g.us"),
      } as any;
    }

    let chat: any;
    try {
      chat = await msg.getChat();
    } catch (err) {
      logger.error(`Error in msg.getChat() for message from ${msg.from}: ${err}. Using fallback.`);
      chat = {
        isGroup: msg.from.endsWith("@g.us") || msg.to.endsWith("@g.us"),
        unreadCount: 1
      };
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!);
    const { companyId } = whatsapp;

    if (chat.isGroup) {
      let msgGroupContact;

      try {
        if (msg.fromMe) {
          msgGroupContact = await wbot.getContactById(msg.to);
        } else {
          msgGroupContact = await wbot.getContactById(msg.from);
        }
      } catch (err) {
        logger.error(`Error getting group contact: ${err}`);
        const groupNumber = msg.fromMe ? msg.to.replace("@g.us", "") : msg.from.replace("@g.us", "");
        msgGroupContact = {
          id: { _serialized: msg.fromMe ? msg.to : msg.from, user: groupNumber },
          number: groupNumber,
          name: "Group " + groupNumber,
          isGroup: true,
        } as any;
      }

      groupContact = await verifyContact(msgGroupContact, companyId);
    }

    const unreadMessages = msg.fromMe ? 0 : (chat.unreadCount > 0 ? chat.unreadCount : 1);

    const contact = await verifyContact(msgContact, companyId);

    if (
      unreadMessages === 0 &&
      whatsapp.farewellMessage &&
      formatBody(whatsapp.farewellMessage, contact) === msg.body
    )
      return;

    const ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      companyId,
      groupContact
    );

    if (msg.hasMedia) {
      await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }

    if (msg.fromMe && !ticket.flowStopped) {
      const autoStopSetting = await Setting.findOne({
        where: { key: "botAutoStopOnReply", companyId }
      });
      const isAutoStopEnabled = !autoStopSetting || autoStopSetting.value !== "disabled";

      if (isAutoStopEnabled) {
        await ticket.update({
          flowStopped: true,
          currentOptionId: null as any
        });
        await ticket.reload();

        const io = getIO();
        io.to(ticket.status)
          .to("notification")
          .to(ticket.id.toString())
          .to(`company-${ticket.companyId}-${ticket.status}`)
          .to(`company-${ticket.companyId}-notification`)
          .emit("ticket", {
            action: "update",
            ticket
          });
      }
    }

    const botEnabledSetting = await Setting.findOne({
      where: { key: "botEnabled", companyId }
    });
    const isBotGloballyEnabled = !botEnabledSetting || botEnabledSetting.value !== "disabled";

    if (ticket.flowStopped || !isBotGloballyEnabled) {
      // Flow stopped manually, auto-stopped on reply, or bot is globally disabled
    } else if (
      !ticket.queueId &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await verifyQueue(wbot, msg, ticket, contact);
    } else if (
      ticket.queueId &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      ticket.status === "pending"
    ) {
      await verifyQueueOption(wbot, msg, ticket, contact);
    } else if (
      !ticket.queueId &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      whatsapp.greetingMessage &&
      !ticket.lastMessageFromMe
    ) {
      const body = formatBody(`\u200e${whatsapp.greetingMessage}`, contact);
      const sentMessage = await wbot.sendMessage(getTargetJid(ticket, contact), body);
      await verifyMessage(sentMessage, ticket, contact);
    }

    if (msg.type === "vcard") {
      try {
        const array = msg.body.split("\n");
        const obj = [];
        let contact = "";
        for (let index = 0; index < array.length; index++) {
          const v = array[index];
          const values = v.split(":");
          for (let ind = 0; ind < values.length; ind++) {
            if (values[ind].indexOf("+") !== -1) {
              obj.push({ number: values[ind] });
            }
            if (values[ind].indexOf("FN") !== -1) {
              contact = values[ind + 1];
            }
          }
        }
        for await (const ob of obj) {
          const cont = await CreateContactService({
            name: contact,
            number: ob.number.replace(/\D/g, ""),
            companyId: 1
          } as any);
        }
      } catch (error) {
        console.log(error);
      }
    }

    /* if (msg.type === "multi_vcard") {
      try {
        const array = msg.vCards.toString().split("\n");
        let name = "";
        let number = "";
        const obj = [];
        const conts = [];
        for (let index = 0; index < array.length; index++) {
          const v = array[index];
          const values = v.split(":");
          for (let ind = 0; ind < values.length; ind++) {
            if (values[ind].indexOf("+") !== -1) {
              number = values[ind];
            }
            if (values[ind].indexOf("FN") !== -1) {
              name = values[ind + 1];
            }
            if (name !== "" && number !== "") {
              obj.push({
                name,
                number
              });
              name = "";
              number = "";
            }
          }
        }

        // eslint-disable-next-line no-restricted-syntax
        for await (const ob of obj) {
          try {
            const cont = await CreateContactService({
              name: ob.name,
              number: ob.number.replace(/\D/g, "")
            });
            conts.push({
              id: cont.id,
              name: cont.name,
              number: cont.number
            });
          } catch (error) {
            if (error.message === "ERR_DUPLICATED_CONTACT") {
              const cont = await GetContactService({
                name: ob.name,
                number: ob.number.replace(/\D/g, ""),
                email: ""
              });
              conts.push({
                id: cont.id,
                name: cont.name,
                number: cont.number
              });
            }
          }
        }
        msg.body = JSON.stringify(conts);
      } catch (error) {
        console.log(error);
      }
    } */
  } catch (err: any) {
    Sentry.captureException(err);
    
    // Manejar AppError y otros tipos de error
    let message = "Unknown error";
    let stack = undefined;
    let errorDetails: any = {};
    
    if (err?.message) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    }
    
    if (err instanceof Error) {
      stack = err.stack;
    }
    
    // Capturar todas las propiedades del error
    if (err && typeof err === "object") {
      errorDetails = { ...err };
    }
    
    console.error("🔴 ERROR PROCESSING MESSAGE:", {
      message,
      statusCode: err?.statusCode,
      type: err?.constructor?.name || typeof err,
      stack,
      fullError: JSON.stringify(errorDetails, null, 2)
    });
    
    logger.error({
      message,
      statusCode: err?.statusCode,
      type: err?.constructor?.name || typeof err,
      stack
    }, `Error handling whatsapp message: ${message}`);
  }
};

const handleMsgAck = async (msg: WbotMessage, ack: MessageAck) => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageId = typeof msg?.id === "object" && msg.id !== null ? (msg.id.id || msg.id._serialized) : msg.id;
    const messageToUpdate = await Message.findByPk(messageId, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });
    if (!messageToUpdate) {
      return;
    }
    const safeAck = ack !== null && ack !== undefined ? Number(ack) : messageToUpdate.ack;
    await messageToUpdate.update({ ack: safeAck });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

const wbotMessageListener = (wbot: Session): void => {
  wbot.on("message_create", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("media_uploaded", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("message_ack", async (msg, ack) => {
    handleMsgAck(msg, ack);
  });
};

export { wbotMessageListener, handleMessage };
