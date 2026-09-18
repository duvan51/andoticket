import { Request, Response } from "express";
import axios from "axios";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Setting from "../models/Setting";
import { logger } from "../utils/logger";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";

interface CacheEntry {
  timestamp: number;
  data: any[];
}
const productsCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL cache

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { companyId } = req.user;
  const settings = await ListSettingsService(companyId);

  return res.status(200).json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { value } = req.body;

  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

export const uploadLogo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin" && req.user.profile !== "superadmin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const file = req.file;
  if (!file) {
    throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  }

  const { companyId } = req.user;
  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  await company.update({ logo: file.filename });

  return res.status(200).json(company);
};

export const getExternalProducts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { search, refresh } = req.query as { search?: string; refresh?: string };

  const cacheKey = `${companyId}_${search || ""}`;
  const now = Date.now();

  if (refresh !== "true" && productsCache[cacheKey]) {
    const entry = productsCache[cacheKey];
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(entry.data);
    }
  }

  const urlSetting = await Setting.findOne({
    where: { key: "externalProductsApiUrl", companyId }
  });

  if (!urlSetting || !urlSetting.value) {
    return res.status(200).json([]);
  }

  const keySetting = await Setting.findOne({
    where: { key: "externalProductsApiKey", companyId }
  });

  const headers: Record<string, string> = {};
  if (keySetting && keySetting.value) {
    const token = keySetting.value.trim();
    headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    headers["apikey"] = token.replace(/^Bearer\s+/i, "");
    headers["x-api-key"] = token.replace(/^Bearer\s+/i, "");
  }

  try {
    const response = await axios.get(urlSetting.value.trim(), {
      params: search ? { search, q: search } : undefined,
      headers
    });

    const data = response.data;
    let products: any[] = [];

    if (Array.isArray(data)) {
      products = data;
    } else if (data && typeof data === "object") {
      products = data.products || data.data || data.items || data.results || [];
    }

    productsCache[cacheKey] = {
      timestamp: now,
      data: products
    };

    return res.status(200).json(products);
  } catch (err: any) {
    logger.error(`Error querying external products API (${urlSetting.value}): ${err?.response?.data ? JSON.stringify(err.response.data) : err.message || err}`);
    return res.status(200).json([]);
  }
};

export const getMediaProxy = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { url } = req.query as { url?: string };

  if (!url) {
    throw new AppError("ERR_NO_URL_PROVIDED", 400);
  }

  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });

    const contentType = String(response.headers["content-type"] || "image/jpeg");
    res.setHeader("Content-Type", contentType);
    return res.status(200).send(response.data);
  } catch (err: any) {
    logger.error(`Error in media proxy for URL ${url}: ${err.message || err}`);
    throw new AppError("ERR_FETCHING_MEDIA_PROXY", 500);
  }
};
