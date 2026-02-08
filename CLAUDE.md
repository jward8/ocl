# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ocl** — a TypeScript CLI tool that organizes 8 players into two balanced 4-player game groups. It uses player availability history and game statistics to form fair matchups.

## Commands

```bash
npx tsx src/index.ts   # Run the matchup generator
```

Note: `npm start` is defined as `node index.ts` which won't work — use `npx tsx src/index.ts` instead. No test, lint, or build tooling is configured.

## Architecture

**Runtime:** Node.js with [tsx](https://github.com/privatenumber/tsx) (esbuild-based TypeScript executor). No tsconfig.json — relies on tsx defaults.

### Source layout

- `src/index.ts` — Entry point and all core logic: type definitions, matchup algorithm, display functions
- `src/player_utils.ts` — Exports `PLAYERS` constant mapping player names to their index in the stats array
- `src/data/records.json` — Player data store (stats array with 8 players). Each player has: `name`, `gamesPlayed`, `history` (8-element availability array), `points`, `victoryPoints`, `averagePlacement`

### Key types

- `player` — player record with stats and an 8-element `history` array
- `historyIndex` — pairs an `availability` score with a `playerIndex`

### Matchup algorithm (`gatherMatchups` → `generateGroup`)

1. Selects the player with the fewest games played as a seed
2. Recursively builds a 4-player group via `generateGroup()`:
   - Finds candidates with the lowest availability score (above -1 threshold) using `findAllWithMinAvailability()`
   - Randomly picks among tied candidates
   - Recomputes weighted average availability for the growing group
   - Base case: group reaches size 4
3. The remaining 4 players form the second group
4. `-1` in the history array means "self" (a player can't play against themselves)
