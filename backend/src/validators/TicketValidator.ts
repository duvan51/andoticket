import * as Yup from "yup";

export const ticketSchema = Yup.object().shape({
  contactId: Yup.number()
    .positive("Contact ID must be positive")
    .required("Contact ID is required"),
  status: Yup.string()
    .oneOf(["open", "pending", "closed"], "Invalid status")
    .default("open"),
  queueId: Yup.number().positive("Queue ID must be positive"),
  userId: Yup.number().positive("User ID must be positive")
});

export const ticketUpdateSchema = Yup.object().shape({
  status: Yup.string().oneOf(["open", "pending", "closed"], "Invalid status"),
  queueId: Yup.number().positive("Queue ID must be positive").nullable(),
  userId: Yup.number().positive("User ID must be positive").nullable()
});

export const ticketIndexQuerySchema = Yup.object().shape({
  searchParam: Yup.string(),
  pageNumber: Yup.string().matches(/^\d+$/, "Page number must be a positive integer"),
  status: Yup.string().oneOf(["open", "pending", "closed", "all"]),
  date: Yup.string(),
  showAll: Yup.string().oneOf(["true", "false"]),
  withUnreadMessages: Yup.string().oneOf(["true", "false"]),
  queueIds: Yup.string().test(
    "is-valid-json",
    "Queue IDs must be a valid JSON array",
    (value) => {
      if (!value) return true;
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) && parsed.every((item: unknown) => typeof item === "number");
      } catch {
        return false;
      }
    }
  ),
  tagId: Yup.string().matches(/^\d+$/, "Tag ID must be a positive integer"),
  unanswered: Yup.string().oneOf(["true", "false"]),
  isGroup: Yup.string().oneOf(["true", "false"])
});
