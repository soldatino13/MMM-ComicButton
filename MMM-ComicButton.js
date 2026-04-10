"use strict";

Module.register("MMM-ComicButton", {
  defaults: {
    anthropicKey:     "YOUR_ANTHROPIC_API_KEY",
    openaiKey:        "YOUR_OPENAI_API_KEY",
    mastodonInstance: "https://YOUR.MASTODON.INSTANCE",
    mastodonToken:    "YOUR_MASTODON_ACCESS_TOKEN",
    imageSize:        "1792x1024",
    comicStyles: [
      // Deutsch/Schweizer Satire
      "Martin Perscheid style, MAD Magazin Germany, black humor, sarcastic caricature, exaggerated ugly faces, newspaper comic strip panel, dense crosshatching, hand-drawn ink",
      "Nebelspalter Magazin Swiss satire, editorial cartoon, sharp political wit, clean ink lines, Swiss German humor, black and white",
      "Wilhelm Busch style, classic German comic, Max und Moritz aesthetic, bold outlines, mischievous humor, vintage 19th century illustration",
      "F.K. Waechter style, German children book satire, absurdist humor, loose ink lines, whimsical characters",

      // US Klassiker
      "Gary Larson Far Side style, single panel newspaper comic, absurd rural humor, thick outlines, plain backgrounds, scientists and animals",
      "Charles Schulz Peanuts style, simple clean lines, minimal backgrounds, dry existential humor, round heads, 1960s newspaper strip",
      "Bill Watterson Calvin and Hobbes style, expressive watercolor, dynamic action, philosophical humor, lush backgrounds",
      "MAD Magazine USA style, manic detailed illustration, chaotic panel, caricature of real events, Mort Drucker influenced",

      // Düster / Experimentell
      "Edward Gorey style, dark crosshatching, gothic absurdist, fur coats and urns, deadpan black humor, Victorian aesthetic, black and white",
      "Ralph Steadman gonzo illustration, splattered ink, chaotic energy, distorted faces, Hunter S. Thompson aesthetic, raw expressionism",
      "Robert Crumb underground comix style, dense stippling, counter-culture, grotesque exaggeration, 1970s underground press",

      // International
      "Quino Mafalda style, Argentine political cartoon, simple clean lines, sharp social commentary, expressive children characters",
      "Hergé Tintin ligne claire style, clean precise outlines, flat colors, no shadows, Belgian comic tradition, detailed backgrounds",
      "Mordillo style, wordless gag cartoon, round cute characters, pastel colors, absurd surreal situations, gentle humor",
      "manga satire style, Osamu Tezuka influenced, exaggerated sweat drops and shock lines, speed lines, satirical commentary",
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

    const styles = this.config.comicStyles?.length
      ? this.config.comicStyles
      : [this.config.comicStyle || "MAD Magazin style, black humor, exaggerated caricature"];
    const idx   = Math.floor(Math.random() * styles.length);
    const style = styles[idx];
    console.log(`[MMM-ComicButton] Style #${idx}: ${style.slice(0, 60)}…`);

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
