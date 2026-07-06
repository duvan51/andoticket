import * as Yup from "yup";

export const userSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string()
    .min(5, "Password must be at least 5 characters")
    .required("Password is required"),
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  profile: Yup.string()
    .oneOf(["admin", "user", "superadmin"], "Invalid profile")
    .default("user"),
  companyId: Yup.number().positive("Company ID must be positive"),
  queueIds: Yup.array().of(Yup.number()),
  whatsappId: Yup.number()
    .transform((value, originalValue) => (originalValue === "" || originalValue === null ? null : value))
    .nullable()
});

export const userUpdateSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email format"),
  password: Yup.string().min(5, "Password must be at least 5 characters"),
  name: Yup.string().min(2, "Name must be at least 2 characters"),
  profile: Yup.string().oneOf(["admin", "user", "superadmin"], "Invalid profile"),
  queueIds: Yup.array().of(Yup.number()),
  whatsappId: Yup.number()
    .transform((value, originalValue) => (originalValue === "" || originalValue === null ? null : value))
    .nullable()
});

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string()
    .required("Password is required")
});

export const indexQuerySchema = Yup.object().shape({
  searchParam: Yup.string(),
  pageNumber: Yup.string().matches(/^\d+$/, "Page number must be a positive integer"),
  companyId: Yup.number().positive("Company ID must be positive")
});
