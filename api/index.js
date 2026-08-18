import app from "../server/app.js";
import { connectDatabase } from "../server/config/database.js";

let connectionPromise;

function ensureDatabase() {
  if (!connectionPromise) {
    connectionPromise = connectDatabase();
  }

  return connectionPromise;
}

export default async function handler(req, res) {
  try {
    await ensureDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Database connection failed:", error);
    return res.status(500).json({
      success: false,
      message: "Server initialization failed",
    });
  }
}
