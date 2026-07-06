import * as Yup from "yup";

export const whatsappSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  status: Yup.string()
    .oneOf(["initializing", "connected", "disconnected"], "Invalid status"),
  isDefault: Yup.boolean(),
  greetingMessage: Yup.string(),
  farewellMessage: Yup.string(),
  queueIds: Yup.array().of(Yup.number())
});

export const whatsappUpdateSchema = Yup.object().shape({
  name: Yup.string().min(2, "Name must be at least 2 characters"),
  status: Yup.string().oneOf(["initializing", "connected", "disconnected"]),
  isDefault: Yup.boolean(),
  greetingMessage: Yup.string(),
  farewellMessage: Yup.string(),
  queueIds: Yup.array().of(Yup.number())
});
