import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import SignUpService from "../services/UserServices/SignUpService";

import { validate } from "../middleware/validate";
import { userSchema, userUpdateSchema, indexQuerySchema } from "../validators";

interface IndexQuery {
  searchParam?: string;
  pageNumber?: string;
  companyId?: number;
}

export const index = [
  validate(indexQuerySchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { searchParam, pageNumber, companyId: queryCompanyId } = req.query as IndexQuery;

    let companyId: number | undefined = req.user.companyId;

    if (req.user.profile === "superadmin") {
      companyId = queryCompanyId;
    }

    const { users, count, hasMore } = await ListUsersService({
      searchParam,
      pageNumber,
      companyId
    });

    return res.json({ users, count, hasMore });
  }
];

export const store = [
  validate(userSchema),
  async (req: Request, res: Response): Promise<Response> => {
    const { email, password, name, profile, queueIds, whatsappId } = req.body;

    if (req.url === "/signup") {
      const user = await SignUpService({
        email,
        password,
        name,
        companyName: req.body.companyName || name,
        planId: req.body.planId
      });

      return res.status(200).json(user);
    }

    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    if (req.user.profile === "admin" && profile === "superadmin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    let { companyId } = req.user;

    if (req.user.profile === "superadmin" && req.body.companyId) {
      companyId = req.body.companyId;
    }

    const user = await CreateUserService({
      email,
      password,
      name,
      profile,
      queueIds,
      whatsappId,
      companyId
    });

    const io = getIO();
    io.emit("user", {
      action: "create",
      user
    });

    return res.status(200).json(user);
  }
];

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  const user = await ShowUserService(userId);

  return res.status(200).json(user);
};

export const update = [
  validate(userUpdateSchema),
  async (req: Request, res: Response): Promise<Response> => {
    if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const { userId } = req.params;
    const userData = req.body;

    const userToUpdate = await ShowUserService(userId);

    if (req.user.profile !== "superadmin") {
      if (userToUpdate.companyId !== req.user.companyId) {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      if (userToUpdate.profile === "superadmin" || userData.profile === "superadmin") {
        throw new AppError("ERR_NO_PERMISSION", 403);
      }
      userData.companyId = req.user.companyId;
    }

    const user = await UpdateUserService({ userData, userId });

    const io = getIO();
    io.emit("user", {
      action: "update",
      user
    });

    return res.status(200).json(user);
  }
];

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { userId } = req.params;

  const userToDelete = await ShowUserService(userId);

  if (req.user.profile !== "superadmin") {
    if (userToDelete.companyId !== req.user.companyId) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
    if (userToDelete.profile === "superadmin") {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }

  await DeleteUserService(userId);

  const io = getIO();
  io.emit("user", {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};
