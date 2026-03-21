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
    let { username } = req.query;

    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }

    // Strip leading @ if present
    if (username.startsWith("@")) {
      username = username.slice(1);
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
      // Prioritizing tiktok-api23 patterns for speed and reliability
      // We only need ONE successful call, so we try the most likely ones first
      const endpoints = [
        `https://${apiHost}/api/user/info?uniqueId=${username}`,
        `https://${apiHost}/api/user/details?uniqueId=${username}`,
        `https://${apiHost}/user/info?username=${username}`,
        `https://${apiHost}/user/details?username=${username}`
      ];
      
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // Further reduced to 4s for "real quick"
        try {
          console.log(`Fetching: ${url}`);
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
            // Check if we actually got user data
            if (data && (data.userInfo || data.data || data.user)) return data;
          }
          throw new Error(`Failed with status: ${response.status}`);
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      };

      // Try all endpoints in parallel and take the FIRST successful one
      let data;
      try {
        data = await Promise.any(endpoints.map(fetchWithTimeout));
      } catch (e) {
        console.error("All endpoints failed for", username);
        return res.status(404).json({ error: "User not found. Please check the username and try again." });
      }

      // Map the RapidAPI response to our app's expected format
      const userData = data.userInfo?.user || 
                       data.data?.user || 
                       data.user || 
                       data.data || 
                       data.userInfo || 
                       data;
      
      const stats = data.userInfo?.stats || 
                    data.data?.stats || 
                    userData.stats || 
                    data.stats || 
                    {};

      const avatar = userData.avatarThumb || 
                  userData.avatar_thumb || 
                  userData.avatar || 
                  userData.avatarMedium || 
                  userData.avatar_medium || 
                  data.avatarThumb || 
                  data.avatar || 
                  "";

      const profile = {
        avatar: avatar,
        nickname: userData.nickname || 
                  userData.nickname_name || 
                  data.nickname || 
                  username,
        followers: (stats.followerCount || 
                    stats.follower_count || 
                    userData.followerCount || 
                    userData.follower_count || 
                    data.followerCount || 
                    0).toLocaleString(),
        following: (stats.followingCount || 
                    stats.following_count || 
                    userData.followingCount || 
                    0).toLocaleString(),
        hearts: (stats.heartCount || 
                  stats.heart_count || 
                  userData.heartCount || 
                  0).toLocaleString(),
        isReal: true
      };

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
