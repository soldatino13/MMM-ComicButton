# MMM-ComicButton

Ein MagicMirror²-Modul mit Touch-Button, das per Knopfdruck aus der aktuell angezeigten News-Headline automatisch einen **Comic im Stil von Martin Perscheid / MAD Magazin** generiert und direkt auf **Mastodon** postet.

---

## Ablauf

```
[Touch auf Button]
       │
       ▼
Aktuelle Headline (von MMM-NewsComicFeed)
       │
       ▼
① Claude API
  Erstellt einen kreativen DALL-E 3 Prompt
  im Perscheid/MAD-Stil mit schwarzem Humor
       │
       ▼
② OpenAI DALL-E 3
  Generiert das Comic-Bild (1024×1024)
       │
       ▼
③ Mastodon
  Bild + Headline-Caption als neuer Post
       │
       ▼
✅ Fertig – Button reset nach 5 Sekunden
```

---

## Voraussetzungen

- MagicMirror² v2.15 oder neuer
- **MMM-NewsComicFeed** muss ebenfalls installiert sein (liefert die Headline)
- API Keys für Anthropic, OpenAI und Mastodon (Details unten)

---

## Installation

```bash
cd ~/MagicMirror/modules
cp -r ~/MMM-ComicButton .
cd MMM-ComicButton
npm install
```

---

## API Keys einrichten

### Anthropic (Claude)
1. [console.anthropic.com](https://console.anthropic.com/) → API Keys → Create Key
2. Kosten: Claude Sonnet, ~$0.003 pro Aufruf

### OpenAI (DALL-E 3)
1. [platform.openai.com/api-keys](https://platform.openai.com/api-keys) → Create new secret key
2. Kosten: DALL-E 3 Standard 1024×1024 = **~$0.04 pro Bild**

### Mastodon Access Token
1. Mastodon-Instanz öffnen → **Einstellungen → Entwickler → Neue Anwendung**
2. Name: `MagicMirror Comic`
3. Scopes: `write:media` und `write:statuses` aktivieren
4. Speichern → **Ihr Zugriffstoken** kopieren

---

## Konfiguration

```javascript
{
  module:   "MMM-ComicButton",
  position: "bottom_right",
  config: {
    anthropicKey:     "sk-ant-...",
    openaiKey:        "sk-...",
    mastodonInstance: "https://mastodon.social",   // deine Instanz
    mastodonToken:    "dein_access_token",
    imageSize:        "1024x1024",
    comicStyle:       "Martin Perscheid, MAD Magazin, black humor, sarcastic, exaggerated faces, newspaper comic strip panel, hand-drawn ink style",
  },
},
```

### Alle Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `anthropicKey` | – | Anthropic API Key (Pflicht) |
| `openaiKey` | – | OpenAI API Key (Pflicht) |
| `mastodonInstance` | – | URL deiner Mastodon-Instanz, z.B. `https://mastodon.social` (Pflicht) |
| `mastodonToken` | – | Mastodon Access Token (Pflicht) |
| `imageSize` | `"1024x1024"` | DALL-E Bildgrösse: `"1024x1024"`, `"1792x1024"`, `"1024x1792"` |
| `comicStyle` | Perscheid/MAD | Freitext-Stilanweisung für Claude's Prompt-Generierung |

---

## Zustände des Buttons

| Zustand | Anzeige | Beschreibung |
|---|---|---|
| **idle** | 🎨 Comic generieren | Bereit – zeigt aktuelle Headline als Vorschau |
| **idle (kein Feed)** | Ausgegraut | Noch keine Headline von MMM-NewsComicFeed empfangen |
| **generating** | Spinner + Statustext | Pipeline läuft (ca. 10–20 Sekunden gesamt) |
| **done** | ✅ Mastodon gepostet! | Erfolgreich – reset nach 5s |
| **error** | ❌ Fehlermeldung | Fehler – reset nach 5s, dann erneut versuchen |

### Statustexte während Generierung

1. `Erstelle Comic-Prompt via Claude…`
2. `Generiere Bild mit DALL-E 3…`
3. `Lade Bild herunter…`
4. `Lade auf Mastodon hoch…`
5. `Erstelle Mastodon-Post…`

---

## Comic-Stil anpassen

Der `comicStyle`-Parameter wird direkt in Claude's System-Prompt eingebettet. Beispiele für andere Stile:

```javascript
// Klassischer Zeitungscomic
comicStyle: "Charles Schulz, Peanuts style, clean lines, simple backgrounds, dry humor"

// Düster/Sarkastisch
comicStyle: "Edward Gorey, dark humor, crosshatching, gothic, absurdist, black and white"

// Schweizer Satire
comicStyle: "Nebelspalter Magazin, Swiss political satire, editorial cartoon, sharp wit"

// Manga-Satire
comicStyle: "manga style, exaggerated expressions, speed lines, satirical, Osamu Tezuka"
```

---

## Zusammenspiel mit MMM-NewsComicFeed

MMM-ComicButton **empfängt** die Notification `NEWS_CURRENT_HEADLINE` von MMM-NewsComicFeed. Die zuletzt angezeigte Headline wird im Button als Vorschau eingeblendet und beim Tastendruck für die Generierung verwendet.

Wird MMM-NewsComicFeed **nicht** verwendet, kann die Headline auch manuell per Notification gesetzt werden:

```javascript
// Zum Testen aus der Browser-Konsole:
MM.sendNotification("NEWS_CURRENT_HEADLINE", {
  title:  "Bundesrat erhöht Mehrwertsteuer auf 42%",
  source: "Test",
});
```

---

## Fehlerbehebung

**Button bleibt ausgegraut**
→ MMM-NewsComicFeed läuft nicht oder hat noch keine Headline geladen. Kurz warten oder Feeds prüfen.

**Fehler: „Claude API: …"**
→ Anthropic API Key prüfen. Evtl. Kontolimite überschritten.

**Fehler: „DALL-E API: …"**
→ OpenAI API Key prüfen. Saldo auf [platform.openai.com/usage](https://platform.openai.com/usage) kontrollieren.

**Fehler: „Mastodon upload: …"**
→ Token-Scopes prüfen (`write:media` und `write:statuses` müssen aktiviert sein). Instanz-URL ohne trailing slash angeben.

**Bild wird generiert, aber nicht gepostet**
→ `pm2 logs` für detaillierte Fehlermeldung. Häufig ein Problem mit der Mastodon-Instanz-URL (http vs. https).

---

## Kosten-Schätzung

Pro Tastendruck:
- Claude Sonnet: ~$0.003
- DALL-E 3 Standard: ~$0.040
- **Total: ~$0.043 pro Comic**

Bei 5 Comics täglich: ~$6.50/Monat.

---

## Lizenz

MIT
