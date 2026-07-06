import { Request, Response, NextFunction } from "express";
import * as Yup from "yup";

export const validate = (schema: Yup.ObjectSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      next();
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        return res.status(400).json({
          error: "Validation failed",
          details: err.inner.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
};
