import * as Yup from "yup";

export const companySchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  planId: Yup.number().positive("Plan ID must be positive"),
  dueDate: Yup.date()
});

export const companyUpdateSchema = Yup.object().shape({
  name: Yup.string().min(2, "Name must be at least 2 characters"),
  email: Yup.string().email("Invalid email format"),
  dueDate: Yup.date()
});
