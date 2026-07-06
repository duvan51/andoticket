const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

if (!jwtRefreshSecret) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required");
}

export default {
  secret: jwtSecret,
  expiresIn: "24h",
  refreshSecret: jwtRefreshSecret,
  refreshExpiresIn: "7d"
};
