# MMM-ComicButton

Ein MagicMirror²-Touch-Button, der aus einer **bewusst ausgewählten** News-Headline per KI einen Comic generiert und auf Mastodon postet. Der Comic-Stil wird bei jedem Tastendruck zufällig aus einer konfigurierbaren Liste gewählt.

---

## Flow

```
① Headline im Ticker antippen (MMM-NewsComicFeed)
         │
         ▼
② Button leuchtet gold auf
   zeigt Headline + Quelle
         │
         ▼
③ Button antippen → Generierung startet
         │
   ┌─────┴──────────────────────────────┐
   │  Claude API                        │
   │  Erstellt DALL-E Prompt            │
   │  im zufälligen Comic-Stil          │
   └─────┬──────────────────────────────┘
         │
   ┌─────┴──────────────────────────────┐
   │  OpenAI DALL-E 3                   │
   │  Generiert Bild (1792×1024)        │
   └─────┬──────────────────────────────┘
         │
   ┌─────┴──────────────────────────────┐
   │  Mastodon                          │
   │  Bild + Headline-Caption als Post  │
   └─────┬──────────────────────────────┘
         │
         ▼
④ ✅ Gepostet! – alles reset nach 5s
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
| `mastodonInstance` | – | URL der Mastodon-Instanz ohne trailing slash (Pflicht) |
| `mastodonToken` | – | Mastodon Access Token mit `write:media` + `write:statuses` (Pflicht) |
| `imageSize` | `"1792x1024"` | DALL-E Bildgrösse – siehe Tabelle unten |
| `comicStyles` | Perscheid/MAD | Array von Stil-Strings – zufällig gewählt pro Tastendruck |

### Gültige `imageSize`-Werte (DALL-E 3)

| Wert | Format | Empfehlung |
|---|---|---|
| `1024x1024` | Quadrat | Einzelne Szene |
| `1792x1024` | Querformat | Comic-Panel ✅ |
| `1024x1792` | Hochformat | Portrait, Cartoon-Figur |

---

## Button-Zustände

| Zustand | Aussehen | Beschreibung |
|---|---|---|
| **Wartend** | Ausgegraut, dezent | Noch keine Headline ausgewählt |
| **Bereit** | Gold, klickbar + ▶ | Headline ausgewählt, bereit zum Generieren |
| **Generiert** | Spinner + Schritt | Pipeline läuft (~15–25 Sek.) |
| **Fertig** | ✅ Gepostet! | Erfolgreich – reset nach 5s |
| **Fehler** | ❌ Fehlermeldung | Fehler – reset nach 5s |

### Generierungsschritte

1. `Erstelle Prompt…`
2. `Generiere Bild mit DALL-E 3…`
3. `Lade Bild herunter…`
4. `Lade auf Mastodon hoch…`
5. `Erstelle Mastodon-Post…`

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

---

## Comic-Stile

15 Stile sind vorinstalliert und werden bei jedem Tastendruck zufällig gewählt. Der gewählte Stil wird in `pm2 logs` geloggt.

### Vorinstallierte Stile

| Kategorie | Stil |
|---|---|
| **DE/CH Satire** | Martin Perscheid / MAD Deutschland |
| | Nebelspalter Magazin |
| | Wilhelm Busch (Max und Moritz) |
| | F.K. Waechter |
| **US Klassiker** | Gary Larson (Far Side) |
| | Charles Schulz (Peanuts) |
| | Bill Watterson (Calvin & Hobbes) |
| | MAD Magazine USA |
| **Düster/Experimentell** | Edward Gorey |
| | Ralph Steadman (Gonzo) |
| | Robert Crumb (Underground Comix) |
| **International** | Quino (Mafalda) |
| | Hergé (Tintin / Ligne Claire) |
| | Mordillo (wordless gag cartoon) |
| | Manga / Osamu Tezuka |

### Eigene Stile ergänzen

Einfach weitere Einträge zum Array hinzufügen:

```javascript
comicStyles: [
  // ... bestehende Stile ...

  // Eigene:
  "Jack Davis MAD Magazine style, 1950s horror parody, loose ink, wild expressions",
  "Sempé style, French gentle humor, delicate fine lines, Parisian scenes",
],
```

Der Stil wird als direkter Bestandteil des DALL-E Prompts verwendet – je konkreter, desto besser das Ergebnis.

---

## Notification-Schnittstelle

### Empfängt

```javascript
// Von MMM-NewsComicFeed beim Antippen einer Headline:
"COMIC_HEADLINE_SELECTED" → { source, category, title, link, pubDate }
```

Nach Erhalt dieser Notification wechselt der Button in den **Bereit**-Zustand und zeigt die Headline an.

---

## Kosten pro Tastendruck

| Dienst | Kosten |
|---|---|
| Claude Sonnet | ~$0.003 |
| DALL-E 3 Standard 1792×1024 | ~$0.080 |
| **Total** | **~$0.083** |

---

## Fehlerbehebung

**Button bleibt ausgegraut**
→ Noch keine Headline angetippt. Headline im oberen oder unteren Ticker antippen.

**`imageSize` Fehler in den Logs**
→ Nur `1024x1024`, `1792x1024` oder `1024x1792` sind für DALL-E 3 gültig.

**Fehler: Claude / DALL-E / Mastodon**
→ `pm2 logs` für Details. Häufigste Ursachen:
- Ungültiger oder abgelaufener API Key
- Leeres OpenAI-Guthaben → [platform.openai.com/usage](https://platform.openai.com/usage)
- Mastodon Token ohne `write:media` oder `write:statuses` Scope

---

## Lizenz

MIT
