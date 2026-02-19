# Standup Spinner

A physics-driven lottery machine for picking who runs the daily standup. Balls bounce around inside an oval chamber, one escapes through the top chute, and the winner is revealed with a Keno-style zoom animation.

## Features

- **Physics simulation** — balls are mixed by twin air jets that oscillate to create turbulent, unpredictable flow (powered by [Matter.js](https://brm.io/matter-js/))
- **Keno winner reveal** — the winning ball glides to the centre of the machine and zooms in with a golden glow
- **Shareable team link** — the team roster is encoded in the URL so you can share a link and everyone loads the same team
- **Editable team** — add or remove members at any time via the Edit Team modal; changes persist in `localStorage`
- **Confetti** — a burst fires when a winner is drawn

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
npm run preview
```

## Usage

| Action | How |
|--------|-----|
| Pick a winner | Click **Draw** |
| Draw again | Click **Draw** after the winner is revealed |
| Edit the team | Click **Edit Team**, add/remove names, click **Save** |
| Share the team | Click **Copy Link** — the URL encodes the current roster |

## Default team

The default roster is loaded from [`team.json`](team.json). Edit that file to change the starting members before first run.

## Tech stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Physics | Matter.js |

## Project structure

```
src/
├── App.tsx                    # Root component, draw state machine
├── App.css                    # Global styles
└── components/
    ├── LotteryMachine.tsx     # Physics engine + canvas renderer
    ├── DrawButton.tsx         # Animated draw button
    ├── TeamList.tsx           # Member list with winner highlight
    ├── EditTeamModal.tsx      # Add/remove team members
    └── Confetti.tsx           # Winner confetti burst
```
