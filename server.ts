import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { startNotificationCron, sendPayslipEmail } from "./server/notifications.ts";
import { createEmployeeAccount } from "./server/auth.ts";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Nexvoura API is running" });
  });

  // AI Intelligence Search API
  app.post("/api/intelligence/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "Query is required" });

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key not configured on server" });
      }

      const prompt = `Search for real-time information regarding: "${query}". 
      Return the information as a JSON array of IntelligencePost objects.
      Each object must have: title, content (summary), topic, source, link (if found), and relevance (0-100).
      Topic must be one of: Technology, Economy, Policy, Success Stories, Compliance, Security, Health, Finance, Events.
      Ensure the news is current and highly relevant.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }] 
        }
      });
      
      const jsonStr = response.text;
      if (!jsonStr) {
        return res.status(500).json({ error: "AI failed to generate response" });
      }

      res.json(JSON.parse(jsonStr));
    } catch (error: any) {
      console.error("AI Intelligence Search Failed:", error);
      res.status(500).json({ error: error.message || "Failed to conduct search" });
    }
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

  app.post("/api/payroll/send-payslip", async (req, res) => {
    try {
      const { to, employeeName, month, details, currency } = req.body;
      
      if (!to || !employeeName || !month || !details) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await sendPayslipEmail(to, employeeName, month, details, currency || "$");
      res.json({ success: true, message: "Payslip sent successfully" });
    } catch (error) {
      console.error("Error sending payslip:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/create-employee", async (req, res) => {
    try {
      const { adminUid, employeeData } = req.body;
      
      if (!adminUid || !employeeData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await createEmployeeAccount(adminUid, employeeData);
      res.status(201).json({ success: true, user: result });
    } catch (error: any) {
      console.error("Error creating employee:", error);
      res.status(403).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    try {
      startNotificationCron();
    } catch (e) {
      console.error("Failed to start cron job:", e);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
