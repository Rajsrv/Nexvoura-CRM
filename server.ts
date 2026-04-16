import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { startNotificationCron } from "./server/notifications.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "NexusCRM API is running" });
  });

  // Multi-tenant Lead Submission API (Public)
  app.post("/api/leads", async (req, res) => {
    try {
      const { companyId, name, email, phone, service, message } = req.body;
      
      if (!companyId || !name || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Logic to save lead to Firestore will go here once Firebase is ready
      console.log("New lead received for company:", companyId, { name, email, service });
      
      res.status(201).json({ success: true, message: "Lead submitted successfully" });
    } catch (error) {
      console.error("Error submitting lead:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startNotificationCron();
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
