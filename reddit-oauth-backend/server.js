// Reddit OAuth Backend Server
// Run with: node server.js

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;

// Cache directory - use persistent disk on Render, fallback to local cache
const CACHE_DIR = process.env.CACHE_DIR || path.join(__dirname, "cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
console.log("Cache directory:", CACHE_DIR);

// Serve static files from parent directory for frontend
app.use(express.static(path.join(__dirname, "..")));

// Reddit OAuth configuration
const REDDIT_CONFIG = {
  clientId: process.env.REDDIT_CLIENT_ID || "i3It5V7LR6o2s5BCTy-82A",
  clientSecret: process.env.REDDIT_CLIENT_SECRET || "6m2RxtVnEPLTVBePLSZULLxCiA_GJA",
  redirectUri: process.env.REDDIT_REDIRECT_URI || "http://localhost:8000/auth.html",
  userAgent: "RedditClient/1.0 by YourUsername",
  accessToken: process.env.REDDIT_ACCESS_TOKEN,
};

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow iframe embedding
app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

// Serve static files (optional - you can serve your HTML from here)
app.use(express.static("public"));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Reddit OAuth Backend Server",
    status: "running",
    endpoints: {
      "GET /": "This info",
      "GET /api/config": "Get client configuration",
      "POST /oauth/token": "Exchange OAuth code for token",
      "GET /api/reddit/*": "Proxy Reddit API calls",
    },
  });
});

// Config endpoint - serves token and backend URL
app.get("/api/config", (req, res) => {
  res.json({
    token: REDDIT_CONFIG.accessToken,
    backendUrl: process.env.BACKEND_URL || `http://localhost:${PORT}`,
  });
});

// API endpoint to list all cached posts
app.get("/api/cache", (req, res) => {
  const posts = getAllCachedPosts();
  res.json({ posts, count: posts.length });
});

// API endpoint to import cache data
app.post("/api/cache/import", (req, res) => {
  try {
    const { posts } = req.body;

    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: "Invalid cache data format" });
    }

    let imported = 0;

    // Import each post into the cache
    posts.forEach(post => {
      if (post.path && post.data) {
        const cacheKey = getCacheKey(post.path);
        const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

        const cacheData = {
          path: post.path,
          timestamp: post.timestamp || new Date().toISOString(),
          data: post.data,
        };

        fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
        imported++;
      }
    });

    res.json({
      success: true,
      imported: imported,
      message: `Successfully imported ${imported} posts`
    });
  } catch (error) {
    console.error("Cache import error:", error);
    res.status(500).json({ error: "Failed to import cache", message: error.message });
  }
});

// OAuth token exchange endpoint
app.post("/oauth/token", async (req, res) => {
  const { code, redirect_uri } = req.body;

  console.log("Token exchange request:", {
    code: code?.substring(0, 10) + "...",
    redirect_uri,
    clientId: REDDIT_CONFIG.clientId?.substring(0, 8) + "...",
    hasSecret: !!REDDIT_CONFIG.clientSecret,
  });

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              REDDIT_CONFIG.clientId + ":" + REDDIT_CONFIG.clientSecret,
            ).toString("base64"),
          "User-Agent": REDDIT_CONFIG.userAgent,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirect_uri || REDDIT_CONFIG.redirectUri,
        }),
      },
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Reddit token error:", tokenData);
      return res.status(400).json({
        error: "Token exchange failed",
        details: tokenData,
      });
    }

    console.log("Token exchange successful");

    // Return the token data to the client
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Helper: Generate cache key from path
function getCacheKey(redditPath) {
  return crypto.createHash("md5").update(redditPath).digest("hex");
}

// Helper: Get cached post data
function getCachedPost(redditPath) {
  const cacheKey = getCacheKey(redditPath);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  if (fs.existsSync(cacheFile)) {
    try {
      const fileData = fs.readFileSync(cacheFile, "utf8");
      const cached = JSON.parse(fileData);
      console.log("Cache hit:", redditPath);

      // Return the data part (handle both old and new format)
      return cached.data || cached;
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  }
  return null;
}

// Helper: Save post data to cache
function cachePost(redditPath, data) {
  const cacheKey = getCacheKey(redditPath);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}.json`);

  try {
    // Store metadata alongside cache
    const cacheData = {
      path: redditPath,
      timestamp: new Date().toISOString(),
      data: data,
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    console.log("Cached post:", redditPath);
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

// Helper: Get all cached posts (for display)
function getAllCachedPosts() {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    const posts = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(CACHE_DIR, file);
        const content = fs.readFileSync(filePath, "utf8");
        const cached = JSON.parse(content);

        // Handle both old and new cache format
        if (cached.data) {
          // New format with metadata
          const postData = Array.isArray(cached.data) ? cached.data[0]?.data?.children?.[0]?.data : null;
          posts.push({
            path: cached.path,
            timestamp: cached.timestamp,
            data: cached.data, // Include full data for export
            title: postData?.title || "Unknown",
            subreddit: postData?.subreddit || "Unknown",
            author: postData?.author || "Unknown",
          });
        } else {
          // Old format - try to extract post info
          const postData = Array.isArray(cached) ? cached[0]?.data?.children?.[0]?.data : null;
          posts.push({
            path: "unknown",
            timestamp: fs.statSync(filePath).mtime.toISOString(),
            data: cached, // Include full data for export
            title: postData?.title || "Unknown",
            subreddit: postData?.subreddit || "Unknown",
            author: postData?.author || "Unknown",
          });
        }
      }
    }

    // Sort by timestamp, newest first
    return posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error("Error reading cache:", error);
    return [];
  }
}

// Proxy Reddit API calls (to handle CORS and add authentication)
app.get("/api/reddit/*", async (req, res) => {
  const redditPath = req.params[0];
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  // Check cache first
  const cachedData = getCachedPost(redditPath);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const redditUrl = `https://oauth.reddit.com/${redditPath}`;
    console.log("Fetching from Reddit API:", redditUrl);

    const response = await fetch(redditUrl, {
      headers: {
        Authorization: authHeader,
        "User-Agent": REDDIT_CONFIG.userAgent,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Reddit API error:", data);
      return res.status(response.status).json(data);
    }

    // Cache the successful response
    cachePost(redditPath, data);

    res.json(data);
  } catch (error) {
    console.error("Reddit API proxy error:", error);
    res.status(500).json({
      error: "Proxy error",
      message: error.message,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
});

app.listen(PORT, () => {
  console.log(`Reddit OAuth Backend Server running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(`Configure Reddit app redirect URI to: ${REDDIT_CONFIG.redirectUri}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  POST /oauth/token - Exchange OAuth code for token`);
  console.log(`  GET /api/reddit/* - Proxy Reddit API calls`);
});

module.exports = app;
