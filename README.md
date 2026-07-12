# Entropy Garden

A browser-native art toy / interactive fiction garden: neon-green matrix substrate, a watching panopticon eye, hidden terminals, corrupted timelines, and a pile of easter eggs that reward curiosity over efficiency.

**Initialize. Wander. Reroll. Break containment. Let the eye notice.**

---

## Vibe & intent

Entropy Garden is not a product dashboard or a game with a win screen. It is a **self-contained digital environment** — part ambient installation, part puzzle box, part lore archive — built to feel like you stumbled into a retro-futurist research site that is slightly too aware of you.

The design leans into:

- **Surveillance fiction** — the panopticon comments, idle dissociation blur, behavioral profiling (`analyze` in the terminal)
- **Entropy as play** — identity rerolls, safe/chaos mode, glitch and strobing (with an upfront photosensitivity warning)
- **Discovery over documentation** — trophies for anomalies you trigger in the wild; ciphers, vault media, singularity rituals, arcade cabinets, Cards of Chaos
- **Diegetic UI** — the terminal FAB, sidebar modals, docking bay, and desktop scatter files are part of the fiction, not chrome around it

There is no required path. The “point” is to poke at the garden until it pushes back.

---

## Does this site need an API?

**No — not for what it is today, and not for most natural extensions.**

Entropy Garden is a **static client-side app** deployed to Cloudflare Pages. All core logic runs in the browser; content ships as bundled JS, CSS, and assets; a service worker enables offline play after the first load.

| Works without an API | Would need a backend |
|---|---|
| Matrix, panopticon, terminal, modals, games | Cross-device account sync |
| Lore, poems, cipher, vault media | Leaderboards / shared scores |
| Trophies & prefs in `localStorage` | Aggregate analytics |
| Session behavioral analysis (in-memory) | Server-held secrets / gated content |
| Offline shell via `sw.js` | Real-time multiplayer |

The only server-side code today is `functions/_middleware.js` — MIME-type fallback for Pages, not an application API. There are no `fetch()` calls to a custom backend.

**Recommendation:** stay API-free unless you explicitly want accounts, shared state across devices, or server-side secrets. That matches the privacy posture, keeps hosting simple, and preserves offline portability.

For deeper layout notes, see [`docs/STRUCTURE.md`](docs/STRUCTURE.md).

---

## Behavioral analysis (local only)

`js/modules/behavioral-analysis.js` tracks session metrics (rerolls, chaos toggles, modal use, terminal commands, idle voids, pointer bursts, etc.), derives playful labels (`entropy-addict`, `archivist`, `statue`, …), and surfaces observations through the panopticon and the terminal `analyze` / `behavior` / `profile` commands.

This is **session-local by design** — no external analytics, no telemetry pipeline. The eye watches this visit; persistence across sessions is limited to things like trophies and a few `localStorage` prefs.

**Wired events** (via `recordBehavior()` / `callHook`): rerolls, chaos toggles, modals, terminal, god mode / konami complete, singularity, playlist, docking bay, slot fails, idle dissociation, pong sessions, arcade clear, cards rounds, trophy unlocks, cipher stage advances, scatter breach, pizza deploy.

**Not separately metered** (covered indirectly or low signal): individual pong rally comments, per-card swap micro-actions, matrix cipher wheel spins, iOS poem page turns. Modal opens already capture sidebar/game entry.

---

## Local development

The app uses ES modules and must be served over HTTP — opening `index.html` as `file://` will not work.

```bash
bash scripts/deploy/cloudflare.sh   # build dist/ (same bundle Pages publishes)
bash scripts/dev/serve-local.sh     # serve dist/ (default :8765)
```

bash scripts/dev/serve-local.sh

---

## Stack (short)

- **Frontend:** vanilla JS (ES modules), HTML, CSS
- **Hosting:** Cloudflare Pages (static `dist/`)
- **Persistence:** `localStorage` (trophies, mute prefs, composer draft)
- **Offline:** service worker (`sw.js`)

---

## Content warning

This experience includes rapid flashing, high-contrast strobing, and glitch effects. A photosensitivity warning is shown before initialize. Use **SAFE MODE** if you want a calmer pass; **chaos mode** leans into the grit.
