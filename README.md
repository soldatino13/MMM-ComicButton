# MMM-ComicButton

Ein MagicMirror²-Modul mit Touch-Button, das per Knopfdruck aus einer zufälligen News-Headline automatisch einen **Comic** generiert und direkt auf **Mastodon** postet. Der Comic-Stil wird bei jedem Tastendruck zufällig aus einer konfigurierbaren Liste gewählt.

---

## Ablauf

```
[Touch auf Button]
       │
       ▼
Zufällige Headline aus dem Pool
(gesammelt von allen MMM-NewsComicFeed-Instanzen)
       │
       ▼
① Claude API (claude-sonnet-4)
  Erstellt DALL-E 3 Prompt im gewählten Comic-Stil
       │
       ▼
② OpenAI DALL-E 3
  Generiert das Comic-Bild (1792×1024)
       │
       ▼
③ Mastodon
  Bild + Headline-Caption als neuer Post
       │
       ▼
✅ Button reset nach 5 Sekunden
```

---

## Voraussetzungen

- MagicMirror² v2.15 oder neuer
- **MMM-NewsComicFeed** installiert und konfiguriert
- API Keys für Anthropic, OpenAI und Mastodon

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
[console.anthropic.com](https://console.anthropic.com/) → API Keys → Create Key

### OpenAI (DALL-E 3)
[platform.openai.com/api-keys](https://platform.openai.com/api-keys) → Create new secret key

### Mastodon Access Token
Einstellungen → Entwickler → Neue Anwendung
- Scopes: `write:media` und `write:statuses`
- Instanz-URL ohne trailing slash, z.B. `https://mastodon.social`

---

## Konfiguration

```javascript
{
  module:   "MMM-ComicButton",
  position: "top_right",
  config: {
    anthropicKey:     "sk-ant-...",
    openaiKey:        "sk-...",
    mastodonInstance: "https://mastodon.social",
    mastodonToken:    "dein_access_token",
    imageSize:        "1792x1024",
    comicStyles: [
      "Martin Perscheid, MAD Magazin, black humor, sarcastic, exaggerated faces, newspaper comic strip panel, hand-drawn ink style",
      "Charles Schulz, Peanuts style, clean lines, simple backgrounds, dry humor",
      "Edward Gorey, dark humor, crosshatching, gothic, absurdist, black and white",
      "Nebelspalter Magazin, Swiss political satire, editorial cartoon, sharp wit",
      "manga style, exaggerated expressions, speed lines, satirical, Osamu Tezuka",
    ],
  },
},
```

---

## Alle Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `anthropicKey` | – | Anthropic API Key (Pflicht) |
| `openaiKey` | – | OpenAI API Key (Pflicht) |
| `mastodonInstance` | – | URL der Mastodon-Instanz (Pflicht) |
| `mastodonToken` | – | Mastodon Access Token (Pflicht) |
| `imageSize` | `"1792x1024"` | DALL-E Bildgrösse – nur diese Werte erlaubt: `1024x1024`, `1792x1024`, `1024x1792` |
| `comicStyles` | Perscheid/MAD | Array von Stil-Strings – bei jedem Press wird zufällig einer gewählt |

### Gültige `imageSize`-Werte (DALL-E 3)

| Wert | Format | Empfehlung |
|---|---|---|
| `1024x1024` | Quadrat | Einzelne Szene |
| `1792x1024` | Querformat | Comic-Panel, Panorama ✅ |
| `1024x1792` | Hochformat | Portrait, Cartoon-Figur |

---

## Bildgrösse auf dem Mirror anpassen

Das angezeigte Bild kommt von **MMM-Mastodon**. Grösse via `custom.css` steuern:

```css
/* ~/MagicMirror/config/custom.css */
.MMM-Mastodon img {
  width: 400px !important;
  height: auto !important;
}
```

Der Selektor `.MMM-Mastodon img` funktioniert, weil MagicMirror den Modulnamen automatisch als CSS-Klasse auf den äusseren Container setzt.

---

## Zustände des Buttons

| Zustand | Anzeige |
|---|---|
| **Bereit** | 🎨 Comic · letzte Headline als Vorschau |
| **Kein Feed** | Ausgegraut (bis MMM-NewsComicFeed geladen ist) |
| **Generiert** | Spinner + aktueller Schritt |
| **Fertig** | ✅ Gepostet! (reset nach 5s) |
| **Fehler** | ❌ Fehlermeldung (reset nach 5s) |

### Schritte während der Generierung

1. `Erstelle Prompt…`
2. `Generiere Bild mit DALL-E 3…`
3. `Lade Bild herunter…`
4. `Lade auf Mastodon hoch…`
5. `Erstelle Mastodon-Post…`

---

## Headline-Pool

MMM-ComicButton sammelt automatisch die letzte Headline **jeder** Feed-Quelle aus allen laufenden MMM-NewsComicFeed-Instanzen. Beim Tastendruck wird zufällig eine Headline aus dem Pool gewählt – so kommen Schweizer News (TA, 20min) und Sport-News (TuttoJuve, Formel1) gleichmässig zum Zug.

Der Pool wird fortlaufend aktualisiert: Rotiert ein Ticker zur nächsten Headline, wird der Eintrag für diese Quelle im Pool ersetzt.

---

## Kosten pro Tastendruck

| Dienst | Kosten |
|---|---|
| Claude Sonnet | ~$0.003 |
| DALL-E 3 Standard 1792×1024 | ~$0.080 |
| **Total** | **~$0.083** |

Bei 3 Comics täglich: ~$7.50/Monat.

---

## Fehlerbehebung

**Button bleibt ausgegraut**
→ MMM-NewsComicFeed noch nicht geladen. Button pollt alle 5s automatisch nach (bis zu 1 Min.).

**`imageSize` Fehler**
→ Nur `1024x1024`, `1792x1024` oder `1024x1792` sind für DALL-E 3 gültig.

**Fehler: Claude / DALL-E / Mastodon**
→ `pm2 logs` für Details. Häufigste Ursachen: ungültiger API Key, leeres OpenAI-Guthaben, falsche Mastodon-Scopes.

---

## Lizenz

MIT
