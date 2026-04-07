"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// MMM-ComicButton
//
// Touch-button that:
//  1. Listens for NEWS_CURRENT_HEADLINE from MMM-NewsComicFeed
//  2. On press: sends headline → node_helper
//  3. node_helper: Claude API → DALL-E 3 prompt → image → Mastodon post
// ─────────────────────────────────────────────────────────────────────────────

Module.register("MMM-ComicButton", {
  defaults: {
    anthropicKey: "YOUR_ANTHROPIC_API_KEY",
    openaiKey:    "YOUR_OPENAI_API_KEY",
    mastodonInstance: "https://YOUR.MASTODON.INSTANCE",  // e.g. https://mastodon.social
    mastodonToken:    "YOUR_MASTODON_ACCESS_TOKEN",
    buttonLabel:  "🎨 Comic",
    imageSize:    "1024x1024",
    // Comic style prompt injected into Claude's system prompt
    comicStyle: "Martin Perscheid, MAD Magazin, schwarzer Humor, sarkastisch, übertriebene Gesichter, Karikatur, newspaper comic strip panel",
  },

  start() {
    this.latestHeadline = null;
    this.state          = "idle";   // idle | generating | done | error
    this.statusMsg      = "";
    this.lastImageUrl   = null;
  },

  // Pick up headlines broadcast by MMM-NewsComicFeed
  notificationReceived(notification, payload) {
    if (notification === "NEWS_CURRENT_HEADLINE") {
      this.latestHeadline = payload;
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "COMIC_STATUS") {
      this.state     = payload.state;
      this.statusMsg = payload.message || "";
      if (payload.imageUrl) this.lastImageUrl = payload.imageUrl;
      this.updateDom(300);

      // Auto-reset to idle after success/error
      if (this.state === "done" || this.state === "error") {
        setTimeout(() => {
          this.state     = "idle";
          this.statusMsg = "";
          this.updateDom(300);
        }, 5000);
      }
    }
  },

  getDom() {
    const w = document.createElement("div");
    w.className = "comic-btn-wrap";

    if (this.state === "generating") {
      w.innerHTML = `
        <div class="comic-btn-spinner">
          <div class="comic-spinner"></div>
          <div class="comic-status-msg">${this.statusMsg || "Generiere…"}</div>
        </div>`;
      return w;
    }

    if (this.state === "done") {
      w.innerHTML = `
        <div class="comic-btn-done">
          <div class="comic-done-icon">✅</div>
          <div class="comic-status-msg">Mastodon gepostet!</div>
        </div>`;
      return w;
    }

    if (this.state === "error") {
      w.innerHTML = `
        <div class="comic-btn-error">
          <div class="comic-error-icon">❌</div>
          <div class="comic-status-msg">${this.statusMsg}</div>
        </div>`;
      return w;
    }

    // ── Idle state: show button ──────────────────────────────
    const btn = document.createElement("div");
    btn.className = "comic-btn" + (this.latestHeadline ? "" : " comic-btn-disabled");

    if (this.latestHeadline) {
      btn.innerHTML = `
        <div class="comic-btn-icon">🎨</div>
        <div class="comic-btn-label">Comic generieren</div>
        <div class="comic-btn-headline">"${this._truncate(this.latestHeadline.title, 55)}"</div>
        <div class="comic-btn-source">${this.latestHeadline.source}</div>
      `;
      btn.addEventListener("click", () => this._onPress());
    } else {
      btn.innerHTML = `
        <div class="comic-btn-icon">🎨</div>
        <div class="comic-btn-label">Comic generieren</div>
        <div class="comic-btn-headline">Warte auf Headline…</div>
      `;
    }

    w.appendChild(btn);
    return w;
  },

  _onPress() {
    if (!this.latestHeadline || this.state === "generating") return;
    this.state     = "generating";
    this.statusMsg = "Erstelle Comic-Prompt…";
    this.updateDom(200);

    this.sendSocketNotification("COMIC_GENERATE", {
      headline:         this.latestHeadline,
      anthropicKey:     this.config.anthropicKey,
      openaiKey:        this.config.openaiKey,
      mastodonInstance: this.config.mastodonInstance,
      mastodonToken:    this.config.mastodonToken,
      imageSize:        this.config.imageSize,
      comicStyle:       this.config.comicStyle,
    });
  },

  _truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  },

  getStyles() { return ["MMM-ComicButton.css"]; },
});
