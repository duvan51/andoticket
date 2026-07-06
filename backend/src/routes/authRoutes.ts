import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import * as GoogleController from "../controllers/GoogleController";
import isAuth from "../middleware/isAuth";

const authRoutes = Router();

authRoutes.post("/signup", UserController.store);

authRoutes.post("/login", SessionController.store);

authRoutes.post("/refresh_token", SessionController.update);

authRoutes.delete("/logout", isAuth, SessionController.remove);

// Google OAuth routes
authRoutes.post("/google", GoogleController.googleAuth);
authRoutes.get("/google/callback", GoogleController.googleCallback);

export default authRoutes;
