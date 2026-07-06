import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import ShowUserService from "../UserServices/ShowUserService";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";
import TicketTracking from "../../models/TicketTracking";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tagId?: string;
  unanswered?: string;
  isInternal?: string;
  companyId?: number;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  status,
  date,
  showAll,
  userId,
  withUnreadMessages,
  tagId,
  unanswered,
  companyId,
  isInternal
}: Request): Promise<Response> => {
  let whereCondition: Filterable["where"] = {};

  if (showAll === "true") {
    whereCondition = {
      queueId: { [Op.or]: [queueIds, null] }
    };
    if (userId) {
      whereCondition = {
        ...whereCondition,
        userId
      };
    }
  } else {
    whereCondition = {
      [Op.or]: [{ userId }, { status: "pending" }],
      queueId: { [Op.or]: [queueIds, null] }
    };
  }

  if (!companyId) {
    throw new Error("ERR_NO_COMPANY_ID");
  }

  if (isInternal === "true") {
    whereCondition = {
      ...whereCondition,
      companyId,
      "$contact.number$": { [Op.like]: "user_%" }
    };
  } else {
    whereCondition = {
      ...whereCondition,
      companyId,
      "$contact.number$": { [Op.notLike]: "user_%" }
    };
  }

  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"],
      where: companyId ? { companyId } : undefined,
      required: false
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"],
      where: tagId ? { id: tagId } : undefined,
      required: tagId ? true : false
    },
    {
      model: TicketTracking,
      as: "trackings",
      include: [{ model: User, as: "user", attributes: ["id", "name"] }]
    },
    {
      model: Message,
      as: "messages",
      attributes: ["id", "body", "createdAt", "mediaType"],
      where: { mediaType: ["note", "tag", "schedule_history"] },
      required: false
    }
  ];



  if (status) {
    whereCondition = {
      ...whereCondition,
      status
    };
  }

  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

    includeCondition = [
      ...includeCondition,
      {
        model: Message,
        as: "messages",
        attributes: ["id", "body"],
        where: {
          body: where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        required: false,
        duplicating: false
      }
    ];

    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          "$contact.name$": where(
            fn("LOWER", col("contact.name")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
        {
          "$message.body$": where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        }
      ]
    };
  }

  if (date) {
    whereCondition = {
      ...whereCondition,
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    };
  }

  if (withUnreadMessages === "true") {
    const user = await ShowUserService(userId);
    const userQueueIds = user.queues?.map(queue => queue.id) || [];

    whereCondition = {
      ...whereCondition,
      [Op.or]: [{ userId }, { status: "pending" }],
      queueId: { [Op.or]: [userQueueIds, null] },
      unreadMessages: { [Op.gt]: 0 }
    };
  }


  if (status === "open") {
    whereCondition = {
      ...whereCondition,
      lastMessageFromMe: unanswered === "true" ? false : true
    };
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]],
    subQuery: false
  });

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
