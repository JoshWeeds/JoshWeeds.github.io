# JoshWeeds.github.io — Project Brief

## What this is
A personal website and digital resume hosted on GitHub Pages. Built with vanilla HTML, CSS, and JS only — no frameworks. Aimed at employers — the goal is a good self-advertisement.

## Audience & tone
- **Landing page**: Professional — employer-first, clean, confident
- **Subpages**: Can be more casual (vacation photos, hobby projects, etc.)

## Landing page vision
- **Fits in the viewport** — no scrolling on most browser sizes (think one screen, not a long page)
- Prominent photo of Josh
- "About" snapshot: CS degree from UMD, current role, key highlights
- Links/nav to subpages (CV, photo gallery, etc.)
- Color scheme: blue + white or blue + grey (will propose options before coding)

## CV / Resume subpage vision
- Wiki-style: headers, subheaders, and a sticky or inline outline so you can jump to a section
- Can be long — scrolling is fine here
- Source of truth: the resume PDF, with golf course job updated to 04/2025 – present

## Resume content (from PDF)
**Education**
- BS Computer Science, University of Maryland College Park — May 2025
- Sustainability Minor, College Park Scholars Program

**Work History** (most recent first)
- Groundskeeper, The Crossvines Golf Course — 04/2025 – present
- Administrative Support (Part-Time), UMD Facilities Management — 02/2025 – 04/2025
- Landscaper, Town of Poolesville — 04/2024 – 09/2024
- Greenskeeper, Gardens by Garth — 04/2023 – 08/2023
- Tech & Community Outreach Intern, Seneca Creek Community Church — 05/2021 – 08/2021
- Cashier, Lewis Orchard — 05/2019 – 07/2019

**Skills**
- Excel, Pandas, SQL, NoSQL
- Conversational Spanish

**Projects**
- Health App (HCI semester project) — group of 4, physical + digital prototyping, focus group testing

**Extracurricular**
- Co-Founder & Social Chair, Branch Out Club at UMD — 05/2021 – 08/2023

## Pages & status

| Page | Path | Status | Notes |
|------|------|--------|-------|
| Landing page | `index.html` | Done (v1) | Viewport-fit, no scroll, color scheme C |
| CV / experience | TBD | Planned | Wiki-style with anchor nav |
| Boulder photo gallery | `BoulderPhotos/` | Functional | CSS merge conflict needs resolving |
| Spurs demo (class project) | `Demo/Instructor.html` | Complete | Likely stays as-is |
| D&D DM Tool | `DnD/` | In design | See full spec below |
| News scraper | `Articles/News/` | Paused | Wanted — later |

## D&D DM Tool spec

### Concept
A DM-facing session tracker. DM has write access on one device. Players can eventually read stats (bar charts) from their own devices. Multi-device read comes with Supabase; local phase is DM-only.

### Data model
Four logical stores (localStorage for now, Supabase later — same structure):

**players** — real names only, no roll data stored (computed on the fly)
- Default/catch-all player: `"DM"`

**characters** — each PC and important NPC
- Fields: `name`, `player` (real name), 
- Default/catch-all character: `"DM"` under player `"DM"` — used for unimportant NPCs and unassigned rolls
- Important NPCs get their own character entry under player `"DM"`

**sessions** — session metadata
- Fields: `arcName`, `arcSession` (session # within arc), `absoluteSession` (running total), `date`
- Display name auto-generated: `"${arcName} ${arcSession}, Session ${absoluteSession}"`
- e.g. `"Throat Cave 2, Session 4"`

**rolls** — source of truth, one entry per roll
- Fields: `player`, `character`, `session` (display name), `dSize`, `result`, `timestamp`
- Campaign implied by session names for now (v1.1 feature to add explicit campaign)

### Die sizes
d4, d6, d8, d10, d12, d20 only (d100 is v1.1)

### UI features
- **Session management**: Create new session, continue most recent, load any session, view campaign overall
- **Roster management**: Add players, add characters linked to a player
- **Current player selector**: Defaults to DM, manual change, "previous player" shortcut button
- **Roll input**: Die size selector + text box + "Roll" button (fills box with random number, does NOT auto-submit) + Confirm button to record
- **Stats display**: Bar chart per die showing roll distribution. Computed from raw rolls on the fly.
- **Session aggregation**: Select arbitrary sessions (e.g. 2, 3, 6) and merge their roll data for comparison

### Storage
- **Phase 1 (now)**: `localStorage` — simple, no file permission prompts, easy Supabase migration
- **Phase 2**: Supabase (PostgreSQL) — enables multi-device reads, real-time updates for players
- Migration path: same data structure, swap the read/write functions

## Design decisions
- Vanilla HTML/CSS/JS — no frameworks or build tools
- Mobile responsive (media queries already in place)
- Each section can have its own sub-stylesheet if needed
- Color scheme: blue + white or blue + grey — propose options before coding
- **Nav**: Top bar with "About Josh" and "Projects" buttons. Projects will eventually be a dropdown linking to individual project pages (and a Projects hub page). Not a today task.
- **Photo**: Placeholder (black/blank) for now — Josh will find one later

## Open questions
- *(none currently)*

## Working agreement
- Claude updates this file when the plan changes and flags it in chat
- User updates this file (or tells Claude) when goals shift
- Both confirm sync at the end of each session
