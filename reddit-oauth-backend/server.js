// Reddit OAuth Backend Server
// Run with: node server.js

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// Reddit OAuth configuration
const REDDIT_CONFIG = {
  clientId: process.env.REDDIT_CLIENT_ID || "i3It5V7LR6o2s5BCTy-82A", // Replace with your Reddit app client ID
  clientSecret:
    process.env.REDDIT_CLIENT_SECRET || "6m2RxtVnEPLTVBePLSZULLxCiA_GJA", // Replace with your Reddit app secret
  redirectUri:
    process.env.REDDIT_REDIRECT_URI || "http://localhost:8000/auth.html", // Your frontend URL
  userAgent: "RedditClient/1.0 by YourUsername", // Change 'YourUsername' to your actual Reddit username
};

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:8000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:8000",
      "http://192.168.1.79:3000",
      "http://192.168.1.79:8000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (optional - you can serve your HTML from here)
app.use(express.static("public"));

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Reddit OAuth Backend Server",
    status: "running",
    endpoints: {
      "GET /": "This info",
      "POST /oauth/token": "Exchange OAuth code for token",
      "GET /api/reddit/*": "Proxy Reddit API calls",
    },
  });
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

// Proxy Reddit API calls (to handle CORS and add authentication)
app.get("/api/reddit/*", async (req, res) => {
  const redditPath = req.params[0];
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }

  try {
    const redditUrl = `https://oauth.reddit.com/${redditPath}`;
    console.log("Proxying Reddit API call:", redditUrl);

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
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
