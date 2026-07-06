import { Request, Response } from "express";
import User from "../models/User";
import AppError from "../errors/AppError";
import authConfig from "../config/auth";
import googleConfig from "../config/google";
import { createAccessToken, createRefreshToken } from "../helpers/CreateTokens";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import Company from "../models/Company";

// Google ID token verification without external library
// Uses built-in fetch to call Google's token info endpoint
const verifyGoogleToken = async (token: string): Promise<{ sub: string; email: string; name: string; picture?: string }> => {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  
  if (!response.ok) {
    throw new AppError("Invalid Google token", 400);
  }
  
  const data = await response.json();
  
  if (!data.sub || !data.email) {
    throw new AppError("Invalid Google token payload", 400);
  }
  
  return {
    sub: data.sub,
    email: data.email,
    name: data.name || data.email,
    picture: data.picture
  };
};

export const googleAuth = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { token: googleToken } = req.body;

  if (!googleToken) {
    throw new AppError("Google token is required", 400);
  }

  try {
    const payload = await verifyGoogleToken(googleToken);

    let user = await User.findOne({
      where: { googleId: payload.sub }
    });

    // If user doesn't exist by googleId, try to find by email
    if (!user) {
      user = await User.findOne({
        where: { email: payload.email }
      });

      if (user) {
        // Link existing account with Google
        user.googleId = payload.sub;
        await user.save();
      }
    }

    // If still no user, create a new one
    if (!user) {
      // Get default company or create one
      let company = await Company.findOne({ where: { id: 1 } });
      
      if (!company) {
        company = await Company.create({
          name: "Default Company",
          planId: 1
        });
      }

      user = await User.create({
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        profile: "admin",
        companyId: company.id,
        passwordHash: "google-oauth-login" // Placeholder for OAuth users
      });
    }

    // Generate JWT tokens
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    SendRefreshToken(res, refreshToken);

    return res.status(200).json({
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    throw new AppError("Google authentication failed", 401);
  }
};

export const googleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  
  // After Google OAuth redirect, redirect to frontend with token
  const { token } = req.query;
  
  if (token) {
    res.redirect(`${frontendUrl}/login?token=${token}`);
  } else {
    res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
};
