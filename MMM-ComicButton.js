"use strict";

Module.register("MMM-ComicButton", {
  defaults: {
    anthropicKey:     "YOUR_ANTHROPIC_API_KEY",
    openaiKey:        "YOUR_OPENAI_API_KEY",
    mastodonInstance: "https://YOUR.MASTODON.INSTANCE",
    mastodonToken:    "YOUR_MASTODON_ACCESS_TOKEN",
    imageSize:        "1792x1024",
    comicStyles: [
      "Martin Perscheid, MAD Magazin, black humor, sarcastic, exaggerated faces, newspaper comic strip panel, hand-drawn ink style",
      "Charles Schulz, Peanuts style, clean lines, simple backgrounds, dry humor",
      "Edward Gorey, dark humor, crosshatching, gothic, absurdist, black and white",
      "Nebelspalter Magazin, Swiss political satire, editorial cartoon, sharp wit",
      "manga style, exaggerated expressions, speed lines, satirical, Osamu Tezuka",
    ],
  },

  start() {
    this.selectedHeadline = null;
    this.state            = "idle";
    this.statusMsg        = "";
  },

  notificationReceived(notification, payload) {
    if (notification === "COMIC_HEADLINE_SELECTED") {
      this.selectedHeadline = payload;
      this.updateDom(250);
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "COMIC_STATUS") {
      this.state     = payload.state;
      this.statusMsg = payload.message || "";
      this.updateDom(300);

      if (this.state === "done" || this.state === "error") {
        setTimeout(() => {
          this.state            = "idle";
          this.statusMsg        = "";
          this.selectedHeadline = null; // reset nach Post
          this.updateDom(300);
        }, 5000);
      }
    }
  },

  getDom() {
    const w = document.createElement("div");
    w.className = "comic-btn-wrap";

    // ── Generating ──────────────────────────────────────────
    if (this.state === "generating") {
      w.innerHTML = `
        <div class="comic-btn-active">
          <div class="comic-spinner"></div>
          <div class="comic-status-msg">${this.statusMsg || "Generiere…"}</div>
        </div>`;
      return w;
    }

    // ── Done ────────────────────────────────────────────────
    if (this.state === "done") {
      w.innerHTML = `<div class="comic-btn-active comic-state-done">✅ Gepostet!</div>`;
      return w;
    }

    // ── Error ───────────────────────────────────────────────
    if (this.state === "error") {
      w.innerHTML = `<div class="comic-btn-active comic-state-error">❌ ${this.statusMsg}</div>`;
      return w;
    }

    // ── Idle: Headline ausgewählt ────────────────────────────
    if (this.selectedHeadline) {
      const btn = document.createElement("div");
      btn.className = "comic-btn comic-btn-ready";
      btn.innerHTML = `
        <span class="comic-btn-icon">🎨</span>
        <div class="comic-btn-content">
          <span class="comic-btn-label">Jetzt generieren</span>
          <span class="comic-btn-headline">${this._truncate(this.selectedHeadline.title, 52)}</span>
          <span class="comic-btn-source">${this.selectedHeadline.source}</span>
        </div>
        <span class="comic-btn-arrow">▶</span>
      `;
      btn.addEventListener("click", () => this._onPress());
      w.appendChild(btn);
      return w;
    }

    // ── Idle: Keine Headline ausgewählt ─────────────────────
    w.innerHTML = `
      <div class="comic-btn comic-btn-waiting">
        <span class="comic-btn-icon">🎨</span>
        <div class="comic-btn-content">
          <span class="comic-btn-label">Comic</span>
          <span class="comic-btn-sub">Headline antippen zum Auswählen</span>
        </div>
      </div>`;
    return w;
  },

  _onPress() {
    if (!this.selectedHeadline || this.state === "generating") return;

    const styles = this.config.comicStyles;
    const style  = styles[Math.floor(Math.random() * styles.length)];

    this.state     = "generating";
    this.statusMsg = "Erstelle Prompt…";
    this.updateDom(200);

    this.sendSocketNotification("COMIC_GENERATE", {
      headline:         this.selectedHeadline,
      comicStyle:       style,
      anthropicKey:     this.config.anthropicKey,
      openaiKey:        this.config.openaiKey,
      mastodonInstance: this.config.mastodonInstance,
      mastodonToken:    this.config.mastodonToken,
      imageSize:        this.config.imageSize,
    });
  },

  _truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  },

  getStyles() { return ["MMM-ComicButton.css"]; },
});
