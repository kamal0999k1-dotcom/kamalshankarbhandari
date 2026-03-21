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

    // Sanitize username (remove @ if present)
    username = username.startsWith("@") ? username.slice(1) : username;

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
      // Try multiple common URL patterns for RapidAPI TikTok endpoints
      // Prioritize the ones most likely to work with tiktok-scraper7
      const endpoints = [
        `https://${apiHost}/user/info?unique_id=${username}`,
        `https://${apiHost}/user/info?uniqueId=${username}`,
        `https://${apiHost}/api/user/info?unique_id=${username}`,
        `https://${apiHost}/user/details?unique_id=${username}`
      ];
      
      const fetchWithTimeout = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s per individual fetch
        try {
          console.log(`Fetching profile from: ${url}`);
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "x-rapidapi-key": apiKey,
              "x-rapidapi-host": apiHost,
            },
            signal: controller.signal
          });
          
          const text = await response.text();
          clearTimeout(timeoutId);
          
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.log(`Failed to parse JSON from ${url}`);
            throw new Error("Invalid JSON");
          }

          if (response.ok) {
            console.log(`Success response from ${url}`);
            
            // tiktok-scraper7 often returns data in a 'data' field or directly
            const userData = data.data?.user || data.user || data.data || data.userInfo || data;
            
            // Check if we actually got user info
            if (userData && (userData.uniqueId || userData.unique_id || userData.nickname || userData.nickname || userData.avatarThumb)) {
              return data;
            }
            
            // Check for common error fields in 200 responses
            const errorMsg = data.error || data.message || data.msg || data.description;
            if (errorMsg) {
              console.log(`API returned 200 but with error in body from ${url}: ${errorMsg}`);
            }
          } else {
            console.log(`Failed response from ${url}: ${response.status} - ${text.slice(0, 100)}`);
          }
          throw new Error("Failed to find user data");
        } catch (e: any) {
          clearTimeout(timeoutId);
          if (e.name !== 'AbortError') {
            console.log(`Error fetching from ${url}: ${e.message}`);
          }
          throw e;
        }
      };

      // Try all endpoints in parallel and take the FIRST successful one
      let data;
      try {
        data = await Promise.any(endpoints.map(fetchWithTimeout));
      } catch (e) {
        // If parallel fails, try a few more common ones sequentially as a last resort
        const fallbackEndpoints = [
          `https://${apiHost}/@${username}`,
          `https://${apiHost}/user/profile?username=${username}`
        ];
        
        for (const url of fallbackEndpoints) {
          try {
            data = await fetchWithTimeout(url);
            if (data) break;
          } catch (err) {
            continue;
          }
        }
        
        if (!data) {
          return res.status(404).json({ error: "User not found on TikTok API" });
        }
      }

      // Map the RapidAPI response to our app's expected format
      // tiktok-scraper7 structure: data.user.uniqueId, data.user.nickname, data.user.avatarThumb
      const userData = data.data?.user || data.user || data.data || data.userInfo?.user || data.userInfo || data;
      const statsData = data.data?.stats || data.stats || data.user?.stats || data.userInfo?.stats || userData;

      const profile = {
        avatar: userData.avatarThumb || userData.avatar_thumb || userData.avatar || userData.avatarMedium || userData.avatar_medium || userData.avatarLarger || userData.avatar_larger || "",
        nickname: userData.nickname || userData.nickName || userData.display_name || userData.uniqueId || userData.unique_id || username,
        followers: (statsData.followerCount || statsData.follower_count || statsData.followers || statsData.follower_count || 0).toLocaleString()
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

  // Image Proxy to bypass TikTok referrer blocks
  app.get("/api/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("URL is required");
    }

    try {
      // Try with full stealth headers first
      const fetchImage = async (targetUrl: string, useReferer: boolean) => {
        const headers: any = {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1",
          "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site"
        };
        
        if (useReferer) {
          headers["Referer"] = "https://www.tiktok.com/";
        }

        return await fetch(targetUrl, { headers });
      };

      let response = await fetchImage(url, true);

      // If 403, try without Referer
      if (response.status === 403) {
        response = await fetchImage(url, false);
      }

      // If still 403 and it's a signed URL, try the unsigned version
      if (response.status === 403 && url.includes("-sign-")) {
        const unsignedUrl = url.replace("-sign-", "-");
        console.log(`Attempting unsigned fallback: ${unsignedUrl}`);
        response = await fetchImage(unsignedUrl, false);
      }

      if (!response.ok) {
        console.error(`Proxy fetch failed for ${url}: ${response.status} ${response.statusText}`);
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      res.setHeader("Cache-Control", "public, max-age=86400");
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Proxy Error:", error);
      res.status(500).send("Error proxying image");
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
