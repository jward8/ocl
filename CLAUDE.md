# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ocl** — a TypeScript CLI tool that organizes 8 players into two balanced 4-player game groups. It uses matchup history and game statistics to form fair matchups.

## Commands

```bash
npx tsx src/index.ts        # Run the interactive menu
npx tsx src/index.ts add-game  # Record a game directly
npm run typecheck           # Type-check the project
```

## Architecture

**Runtime:** Node.js with [tsx](https://github.com/privatenumber/tsx) (esbuild-based TypeScript executor).

### Source layout

- `src/index.ts` — Entry point; routes to menu or direct game recording
- `src/menu.ts` — Interactive menu and data fetching from Supabase
- `src/gameRecorder.ts` — Game recording flow; saves via `record_game` RPC
- `src/matchmaking.ts` — Matchup scoring and generation using pairing history
- `src/display.ts` — Console output helpers
- `src/supabaseClient.ts` — Supabase client initialization
- `src/types.ts` — Shared TypeScript types

### Database

Supabase Postgres. Source of truth is `games` + `game_players`.

- `players` — id, name only
- `games` — id, played_at, largest_army, longest_road
- `game_players` — game_id, player_id, victory_points, placement, placement_points
- `player_stats` (view) — computed games_played, points, victory_points, average_placement
- `player_pairings` (view) — computed games_together for each player pair
- `record_game` (function) — atomic game + game_players insert

Migrations live in `supabase/migrations/`.

### Key types

- `Player` — id and name
- `PlayerStats` — Player plus computed stats from `player_stats` view
- `PlayerPairing` — pairwise matchup history from `player_pairings` view
- `PairingLookup` — Map used by the matchup algorithm for O(1) pairing counts
