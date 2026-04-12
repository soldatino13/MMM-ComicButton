"use strict";

const NodeHelper = require("node_helper");
const https      = require("https");
const http       = require("http");
const fs         = require("fs");
const path       = require("path");
const os         = require("os");
const FormData   = require("form-data");

module.exports = NodeHelper.create({

  socketNotificationReceived(notification, payload) {
    if (notification === "COMIC_GENERATE") {
      this._pipeline(payload);
    }
  },

  // ── Main pipeline ────────────────────────────────────────
  async _pipeline(cfg) {
    const { headline, anthropicKey, openaiKey,
            mastodonInstance, mastodonToken,
            imageSize, comicStyle } = cfg;
    try {
      // 1. Generate DALL-E prompt via Claude
      this._status("Erstelle Comic-Prompt via Claude…");
      const dallePrompt = await this._buildDallePrompt(headline, comicStyle, anthropicKey);
      console.log("[MMM-ComicButton] DALL-E prompt:", dallePrompt);

      // 2. Generate image via gpt-image-1 (returns base64)
      this._status("Generiere Bild…");
      const tmpFile = path.join(os.tmpdir(), `comic_${Date.now()}.png`);
      await this._generateImage(dallePrompt, imageSize, openaiKey, tmpFile);

      // 4. Upload to Mastodon as media
      this._status("Lade auf Mastodon hoch…");
      const mediaId = await this._mastodonUpload(tmpFile, mastodonInstance, mastodonToken);

      // 5. Post status with headline caption
      this._status("Erstelle Mastodon-Post…");
      const caption = `${headline.title}\n\nQuelle: ${headline.source}\n\nKI-generiertes Bild (gpt-image-1.5 via OpenAI, Prompt via Claude)\n\n#MagicMirror #Comic #Satire #AIGenerated`;
      await this._mastodonPost(caption, mediaId, mastodonInstance, mastodonToken);

      // Cleanup
      fs.unlink(tmpFile, () => {});

      this.sendSocketNotification("COMIC_STATUS", {
        state:    "done",
        message:  "Erfolgreich auf Mastodon gepostet!",
      });

    } catch (err) {
      console.error("[MMM-ComicButton] Pipeline error:", err.message);
      this.sendSocketNotification("COMIC_STATUS", {
        state:   "error",
        message: err.message.slice(0, 80),
      });
    }
  },

  // ── Step 1: Claude generates the DALL-E prompt ───────────
  async _buildDallePrompt(headline, comicStyle, apiKey) {
    const body = JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: `Du bist ein Comic-Künstler und Satiriker im Stil von Martin Perscheid und MAD Magazin.
Erstelle einen präzisen Bildgenerierungs-Prompt (auf Englisch) für einen einzelnen Comic-Panel.
Stil: ${comicStyle}.
Regeln:
- Nur den Prompt ausgeben, keine Erklärungen
- Schwarzer Humor, sarkastisch, übertriebene Gesichter
- Keine echten Personen, nur Karikaturen/Archetypen
- Max 200 Wörter`,
      messages: [{
        role:    "user",
        content: `Headline: "${headline.title}" (Quelle: ${headline.source})\n\nErstelle den DALL-E Prompt dazu.`,
      }],
    });

    const data = await this._apiPost("https://api.anthropic.com/v1/messages", body, {
      "Content-Type":       "application/json",
      "x-api-key":          apiKey,
      "anthropic-version":  "2023-06-01",
    });

    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error("Claude API: " + parsed.error.message);
    return parsed.content?.[0]?.text?.trim() ?? "";
  },

  // ── Step 2: gpt-image-1 – gibt base64 zurück, direkt speichern ──
  async _generateImage(prompt, size, apiKey, destFile) {
    const body = JSON.stringify({
      model:           "gpt-image-1.5",
      prompt:          prompt,
      size:            size,
      quality:         "medium",
      n:               1,
    });

    const data = await this._apiPost("https://api.openai.com/v1/images/generations", body, {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    });

    const parsed = JSON.parse(data);
    if (parsed.error) throw new Error("OpenAI API: " + parsed.error.message);
    const b64 = parsed.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI: Kein Bild in Antwort (b64_json leer)");

    // Base64 → Datei schreiben (kein separater Download nötig)
    fs.writeFileSync(destFile, Buffer.from(b64, "base64"));
    console.log("[MMM-ComicButton] Bild gespeichert:", destFile);
  },

  // ── Step 4: Upload image to Mastodon ─────────────────────
  _mastodonUpload(filePath, instance, token) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", fs.createReadStream(filePath), {
        filename:    "comic.png",
        contentType: "image/png",
      });

      const parsed    = new URL(`${instance}/api/v2/media`);
      const headers   = {
        ...form.getHeaders(),
        "Authorization": `Bearer ${token}`,
      };
      const options   = {
        hostname: parsed.hostname,
        path:     parsed.pathname,
        method:   "POST",
        headers,
      };

      const lib = parsed.protocol === "https:" ? https : http;
      const req = lib.request(options, (res) => {
        let buf = "";
        res.on("data", c => (buf += c));
        res.on("end", () => {
          try {
            const r = JSON.parse(buf);
            if (r.error) return reject(new Error("Mastodon upload: " + r.error));
            resolve(r.id);
          } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      form.pipe(req);
    });
  },

  // ── Step 5: Post Mastodon status ─────────────────────────
  _mastodonPost(status, mediaId, instance, token) {
    return new Promise((resolve, reject) => {
      const body     = JSON.stringify({ status, media_ids: [mediaId] });
      const parsed   = new URL(`${instance}/api/v1/statuses`);
      const options  = {
        hostname: parsed.hostname,
        path:     parsed.pathname,
        method:   "POST",
        headers:  {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
      };
      const lib = parsed.protocol === "https:" ? https : http;
      const req = lib.request(options, (res) => {
        let buf = "";
        res.on("data", c => (buf += c));
        res.on("end", () => {
          try {
            const r = JSON.parse(buf);
            if (r.error) return reject(new Error("Mastodon post: " + r.error));
            resolve(r);
          } catch (e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  },

  // ── Helpers ───────────────────────────────────────────────
  _apiPost(url, body, headers) {
    return new Promise((resolve, reject) => {
      const parsed  = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   "POST",
        headers:  { ...headers, "Content-Length": Buffer.byteLength(body) },
      };
      const lib = parsed.protocol === "https:" ? https : http;
      const req = lib.request(options, (res) => {
        let buf = "";
        res.on("data", c => (buf += c));
        res.on("end", () => resolve(buf));
      });
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  },

  _status(message) {
    this.sendSocketNotification("COMIC_STATUS", { state: "generating", message });
  },
});
