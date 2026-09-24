import { supabase } from "./supabaseClient";
import { Game, GamePlayerRow, Player, PlayerPairing } from "./types";

export type GroupPlayResult = {
    matrix: number[][];
    rowTotals: number[];
};

export type RivalResult = {
    playerId: string;
    rivalId: string | null;
    gamesTogether: number;
    avgPlacementGap: number;
    avgVpGap: number;
};

export type HistoricPoint = {
    week: number;
    dateRange: string;
    rank: number;
};

function pairingKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export async function fetchGames(): Promise<Game[]> {
    const { data, error } = await supabase
        .from("games")
        .select("id, created_at, played_at, largest_army, longest_road")
        .order("played_at")
        .order("created_at");

    if (error) {
        console.error("Error fetching games:", error.message);
        process.exit(1);
    }

    return data as Game[];
}

export async function fetchGamePlayerRows(): Promise<GamePlayerRow[]> {
    const { data, error } = await supabase
        .from("game_players")
        .select("game_id, player_id, victory_points, placement, placement_points, forfeited");

    if (error) {
        console.error("Error fetching game players:", error.message);
        process.exit(1);
    }

    return (data as any[]).map((row) => ({
        ...row,
        victory_points: Number(row.victory_points),
        placement: Number(row.placement),
        placement_points: Number(row.placement_points),
    }));
}

/**
 * games_together for every pair of players, as a symmetric matrix.
 * Pairs that never met stay 0; the diagonal is 0 and rendered blank.
 */
export function buildGroupPlayMatrix(players: Player[], pairings: PlayerPairing[]): GroupPlayResult {
    const indexById = new Map(players.map((p, i) => [p.id, i]));
    const matrix = players.map(() => players.map(() => 0));

    for (const pairing of pairings) {
        const i = indexById.get(pairing.player_a_id);
        const j = indexById.get(pairing.player_b_id);
        if (i === undefined || j === undefined) continue;
        matrix[i][j] = pairing.games_together;
        matrix[j][i] = pairing.games_together;
    }

    const rowTotals = matrix.map((row) => row.reduce((sum, n) => sum + n, 0));
    return { matrix, rowTotals };
}

export function countBonusHolders(games: Game[]): {
    largestArmy: Map<string, number>;
    longestRoad: Map<string, number>;
} {
    const largestArmy = new Map<string, number>();
    const longestRoad = new Map<string, number>();

    for (const game of games) {
        if (game.largest_army) {
            largestArmy.set(game.largest_army, (largestArmy.get(game.largest_army) ?? 0) + 1);
        }
        if (game.longest_road) {
            longestRoad.set(game.longest_road, (longestRoad.get(game.longest_road) ?? 0) + 1);
        }
    }

    return { largestArmy, longestRoad };
}

type PairAccum = {
    games: number;
    /** Perspective of `firstId`: their placement minus the opponent's. Positive = worse for firstId. */
    placementGap: number;
    /** Perspective of `firstId`: opponent's VP minus theirs. Positive = worse for firstId. */
    vpGap: number;
    firstId: string;
};

/**
 * Each player's statistically worst opponent.
 *
 * For every unordered pair sharing a (non-forfeited) game, accumulate the
 * placement and VP margin from the first-listed player's perspective. A
 * player's margin vs an opponent is the negation when they were listed
 * second. Rival = eligible opponent (2+ shared games) with the worst
 * average placement gap; ties broken by VP gap, then by more games.
 */
export function computeRivals(rows: GamePlayerRow[], players: Player[]): RivalResult[] {
    const rowsByGame = new Map<string, GamePlayerRow[]>();
    for (const row of rows) {
        if (row.forfeited) continue;
        const list = rowsByGame.get(row.game_id) ?? [];
        list.push(row);
        rowsByGame.set(row.game_id, list);
    }

    const pairs = new Map<string, PairAccum>();
    for (const gameRows of rowsByGame.values()) {
        for (let i = 0; i < gameRows.length; i++) {
            for (let j = i + 1; j < gameRows.length; j++) {
                const a = gameRows[i];
                const b = gameRows[j];
                const key = pairingKey(a.player_id, b.player_id);
                const accum = pairs.get(key) ?? {
                    games: 0,
                    placementGap: 0,
                    vpGap: 0,
                    firstId: a.player_id,
                };
                accum.games += 1;
                accum.placementGap += a.placement - b.placement;
                accum.vpGap += b.victory_points - a.victory_points;
                pairs.set(key, accum);
            }
        }
    }

    const MIN_SHARED_GAMES = 2;

    return [...players]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((player) => {
            let best: { rivalId: string; games: number; avgPlacementGap: number; avgVpGap: number } | null = null;

            for (const [key, accum] of pairs) {
                const [idA, idB] = key.split("|");
                const opponentId = idA === player.id ? idB : idB === player.id ? idA : null;
                if (opponentId === null || accum.games < MIN_SHARED_GAMES) continue;

                const fromFirst = accum.firstId === player.id;
                const avgPlacementGap = (fromFirst ? accum.placementGap : -accum.placementGap) / accum.games;
                const avgVpGap = (fromFirst ? accum.vpGap : -accum.vpGap) / accum.games;

                if (
                    best === null ||
                    avgPlacementGap > best.avgPlacementGap ||
                    (avgPlacementGap === best.avgPlacementGap && avgVpGap > best.avgVpGap) ||
                    (avgPlacementGap === best.avgPlacementGap && avgVpGap === best.avgVpGap && accum.games > best.games)
                ) {
                    best = { rivalId: opponentId, games: accum.games, avgPlacementGap, avgVpGap };
                }
            }

            return {
                playerId: player.id,
                rivalId: best?.rivalId ?? null,
                gamesTogether: best?.games ?? 0,
                avgPlacementGap: best?.avgPlacementGap ?? 0,
                avgVpGap: best?.avgVpGap ?? 0,
            };
        });
}

/**
 * A player's leaderboard rank after each "week" (a fixed pair of games).
 *
 * Games are walked in chronological order (played_at, then created_at).
 * After every pair, all players with at least one game are ranked by
 * cumulative placement points desc, victory points desc, then name.
 * Weeks where the target player had not yet played are omitted.
 */
export function computeHistoricPositions(
    games: Game[],
    rows: GamePlayerRow[],
    players: Player[],
    targetId: string
): HistoricPoint[] {
    const rowsByGame = new Map<string, GamePlayerRow[]>();
    for (const row of rows) {
        const list = rowsByGame.get(row.game_id) ?? [];
        list.push(row);
        rowsByGame.set(row.game_id, list);
    }

    const points = new Map<string, number>();
    const victoryPoints = new Map<string, number>();
    const hasPlayed = new Set<string>();
    const trajectory: HistoricPoint[] = [];

    for (let w = 0; w < games.length; w += 2) {
        const weekGames = games.slice(w, w + 2);

        for (const game of weekGames) {
            for (const row of rowsByGame.get(game.id) ?? []) {
                points.set(row.player_id, (points.get(row.player_id) ?? 0) + row.placement_points);
                victoryPoints.set(row.player_id, (victoryPoints.get(row.player_id) ?? 0) + row.victory_points);
                hasPlayed.add(row.player_id);
            }
        }

        if (!hasPlayed.has(targetId)) continue;

        const pool = players
            .filter((p) => hasPlayed.has(p.id))
            .sort((a, b) => {
                const pa = points.get(a.id) ?? 0;
                const pb = points.get(b.id) ?? 0;
                if (pa !== pb) return pb - pa;
                const va = victoryPoints.get(a.id) ?? 0;
                const vb = victoryPoints.get(b.id) ?? 0;
                if (va !== vb) return vb - va;
                return a.name.localeCompare(b.name);
            });

        const rank = pool.findIndex((p) => p.id === targetId) + 1;
        const dates = weekGames.map((g) => g.played_at).filter((d): d is string => d !== null);
        const dateRange = dates.length > 0 ? `${dates[0]}–${dates[dates.length - 1]}` : "—";

        trajectory.push({ week: Math.floor(w / 2) + 1, dateRange, rank });
    }

    return trajectory;
}
