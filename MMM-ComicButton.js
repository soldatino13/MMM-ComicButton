"use strict";

Module.register("MMM-ComicButton", {
  defaults: {
    anthropicKey:     "YOUR_ANTHROPIC_API_KEY",
    openaiKey:        "YOUR_OPENAI_API_KEY",
    mastodonInstance: "https://YOUR.MASTODON.INSTANCE",
    mastodonToken:    "YOUR_MASTODON_ACCESS_TOKEN",
    imageSize:        "1792x1024",
    // Array → zufälliger Stil bei jedem Tastendruck
    comicStyles: [
      "Martin Perscheid, MAD Magazin, black humor, sarcastic, exaggerated faces, newspaper comic strip panel, hand-drawn ink style",
      "Charles Schulz, Peanuts style, clean lines, simple backgrounds, dry humor",
      "Edward Gorey, dark humor, crosshatching, gothic, absurdist, black and white",
      "Nebelspalter Magazin, Swiss political satire, editorial cartoon, sharp wit",
      "manga style, exaggerated expressions, speed lines, satirical, Osamu Tezuka",
    ],
  },

  start() {
    // Pool aus allen Feed-Instanzen
    this.headlinePool = [];
    this.state        = "idle";
    this.statusMsg    = "";

    let attempts = 0;
    this._pollTimer = setInterval(() => {
      if (this.headlinePool.length || ++attempts > 12) {
        clearInterval(this._pollTimer);
        return;
      }
      this.sendNotification("REQUEST_CURRENT_HEADLINE");
    }, 5000);
  },

  notificationReceived(notification, payload) {
    if (notification === "NEWS_CURRENT_HEADLINE" && payload?.title) {
      // Headline im Pool aktualisieren (pro Quelle nur eine, keine Duplikate)
      const idx = this.headlinePool.findIndex(h => h.source === payload.source);
      if (idx >= 0) {
        this.headlinePool[idx] = payload;
      } else {
        this.headlinePool.push(payload);
      }
      clearInterval(this._pollTimer);
      this.updateDom(300);
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "COMIC_STATUS") {
      this.state     = payload.state;
      this.statusMsg = payload.message || "";
      this.updateDom(300);

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
        <div class="comic-btn-active">
          <div class="comic-spinner"></div>
          <div class="comic-status-msg">${this.statusMsg || "Generiere…"}</div>
        </div>`;
      return w;
    }

    if (this.state === "done") {
      w.innerHTML = `<div class="comic-btn-active comic-state-done">✅ Gepostet!</div>`;
      return w;
    }

    if (this.state === "error") {
      w.innerHTML = `<div class="comic-btn-active comic-state-error">❌ ${this.statusMsg}</div>`;
      return w;
    }

    const ready = this.headlinePool.length > 0;
    const preview = ready
      ? this._truncate(this.headlinePool[this.headlinePool.length - 1].title, 48)
      : "–";

    const btn = document.createElement("div");
    btn.className = "comic-btn" + (ready ? "" : " comic-btn-disabled");
    btn.innerHTML = `
      <span class="comic-btn-icon">🎨</span>
      <span class="comic-btn-label">Comic</span>
      <span class="comic-btn-sub">${preview}</span>`;

    if (ready) btn.addEventListener("click", () => this._onPress());
    w.appendChild(btn);
    return w;
  },

  _onPress() {
    if (!this.headlinePool.length || this.state === "generating") return;

    // Zufällige Headline aus dem Pool
    const headline = this.headlinePool[Math.floor(Math.random() * this.headlinePool.length)];
    // Zufälliger Comic-Stil
    const styles   = this.config.comicStyles;
    const style    = styles[Math.floor(Math.random() * styles.length)];

    this.state     = "generating";
    this.statusMsg = "Erstelle Prompt…";
    this.updateDom(200);

    this.sendSocketNotification("COMIC_GENERATE", {
      headline,
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
