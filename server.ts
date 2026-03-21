import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory cache for profile lookups
const profileCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for TikTok Profile Lookup via RapidAPI
  app.get("/api/tiktok/profile", async (req, res) => {
    const { username } = req.query;

    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    // Check cache first
    const cached = profileCache.get(username.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const apiKey = process.env.X_RAPIDAPI_KEY;
    const apiHost = process.env.X_RAPIDAPI_HOST;

    if (!apiKey || !apiHost) {
      return res.status(500).json({ error: "RapidAPI credentials not configured" });
    }

    try {
      // Try multiple common URL patterns for RapidAPI TikTok endpoints in parallel
      const endpoints = [
        `https://${apiHost}/api/user/info?uniqueId=${username}`,
        `https://${apiHost}/user/info?username=${username}`,
        `https://${apiHost}/user/details?username=${username}`,
        `https://${apiHost}/@${username}`,
        `https://${apiHost}/user/profile?username=${username}`
      ];
      
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased to 8s to prevent frequent timeouts
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "x-rapidapi-key": apiKey,
              "x-rapidapi-host": apiHost,
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            if (data) return data;
          }
          throw new Error("Failed");
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      };

      // Try all endpoints in parallel and take the FIRST successful one (Promise.any)
      let data;
      try {
        data = await Promise.any(endpoints.map(fetchWithTimeout));
      } catch (e) {
        // All failed
        return res.status(404).json({ error: "User not found on TikTok API" });
      }

      // Map the RapidAPI response to our app's expected format
      const profile = {
        avatar: data.avatarThumb || data.avatar || data.avatar_thumb || data.user?.avatarThumb || data.user?.avatar_thumb || data.user?.avatar || data.data?.avatarThumb || data.data?.user?.avatarThumb || data.userInfo?.user?.avatarThumb || data.userInfo?.user?.avatarMedium || "",
        nickname: data.nickname || data.user?.nickname || data.data?.nickname || data.data?.user?.nickname || data.userInfo?.user?.nickname || username,
        followers: (data.followerCount || data.follower_count || data.stats?.followerCount || data.user?.stats?.followerCount || data.user?.followerCount || data.data?.stats?.followerCount || data.data?.user?.stats?.followerCount || data.userInfo?.stats?.followerCount || 0).toLocaleString()
      };

      if (!profile.avatar) {
        return res.status(404).json({ error: "User found but no profile picture available" });
      }

      // Store in cache
      profileCache.set(username.toLowerCase(), { data: profile, timestamp: Date.now() });

      res.json(profile);
    } catch (error) {
      console.error("RapidAPI Error:", error);
      res.status(500).json({ error: "Internal server error during profile lookup" });
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
  });
}

startServer();
