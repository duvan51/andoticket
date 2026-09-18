import * as Yup from "yup";

export const whatsappSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  status: Yup.string().nullable().optional(),
  isDefault: Yup.boolean().nullable().optional(),
  greetingMessage: Yup.string().nullable().optional(),
  farewellMessage: Yup.string().nullable().optional(),
  queueIds: Yup.array().of(Yup.number()).nullable().optional()
});

export const whatsappUpdateSchema = Yup.object().shape({
  name: Yup.string().min(2, "Name must be at least 2 characters").optional(),
  status: Yup.string().nullable().optional(),
  isDefault: Yup.boolean().nullable().optional(),
  greetingMessage: Yup.string().nullable().optional(),
  farewellMessage: Yup.string().nullable().optional(),
  queueIds: Yup.array().of(Yup.number()).nullable().optional()
});
