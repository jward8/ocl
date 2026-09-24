import { Player, PlayerPairing, PairingLookup } from "./types";

function pairingKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function buildPairingLookup(pairings: PlayerPairing[]): PairingLookup {
    const lookup: PairingLookup = new Map();
    for (const p of pairings) {
        lookup.set(pairingKey(p.player_a_id, p.player_b_id), p.games_together);
    }
    return lookup;
}

function getGamesTogether(lookup: PairingLookup, a: string, b: string): number {
    return lookup.get(pairingKey(a, b)) ?? 0;
}

/**
 * Sum games played together for all pairwise combinations within a group.
 * Lower score = fresher matchups.
 */
function groupPairScore<T extends Player>(players: T[], groupIndices: number[], lookup: PairingLookup): number {
    let score = 0;
    for (let i = 0; i < groupIndices.length; i++) {
        for (let j = i + 1; j < groupIndices.length; j++) {
            const a = players[groupIndices[i]].id;
            const b = players[groupIndices[j]].id;
            score += getGamesTogether(lookup, a, b);
        }
    }
    return score;
}

/**
 * Generate all C(n, n/2) / 2 unique ways to split n players into two equal groups.
 * Returns pairs of index arrays: [[group1Indices, group2Indices], ...]
 */
function generateAllSplits(n: number): [number[], number[]][] {
    const half = n / 2;
    const allIndices = Array.from({ length: n }, (_, i) => i);
    const splits: [number[], number[]][] = [];

    // Generate all combinations of size `half` that include index 0.
    // Fixing index 0 in group 1 avoids counting each split twice.
    function combine(start: number, combo: number[]) {
        if (combo.length === half) {
            const group1 = combo;
            const group1Set = new Set(group1);
            const group2 = allIndices.filter((i) => !group1Set.has(i));
            splits.push([group1, group2]);
            return;
        }
        const remaining = half - combo.length;
        for (let i = start; i <= n - remaining; i++) {
            combine(i + 1, [...combo, i]);
        }
    }

    // Start with 0 already in the combo to avoid duplicate mirrors
    combine(1, [0]);
    return splits;
}

export interface ScoredMatchup<T extends Player = Player> {
    group1: T[];
    group2: T[];
    score: number;
    isBest: boolean;
}

/**
 * Return all possible splits sorted by score ascending, with isBest flagged.
 */
export function getAllMatchupScores<T extends Player>(players: T[], lookup: PairingLookup): ScoredMatchup<T>[] {
    const splits = generateAllSplits(players.length);

    const scored = splits.map(([g1, g2]) => ({
        group1: g1.map((i) => players[i]),
        group2: g2.map((i) => players[i]),
        score: groupPairScore(players, g1, lookup) + groupPairScore(players, g2, lookup),
    }));

    scored.sort((a, b) => a.score - b.score);
    const minScore = scored[0].score;

    return scored.map((s) => ({ ...s, isBest: s.score === minScore }));
}

/**
 * Score every possible split of 8 players into two groups of 4.
 * Pick randomly among ties at the minimum score.
 */
export function generateMatchups<T extends Player>(players: T[], lookup: PairingLookup): [T[], T[]] {
    const splits = generateAllSplits(players.length);

    let minScore = Infinity;
    let bestSplits: [number[], number[]][] = [];

    for (const [g1, g2] of splits) {
        const score = groupPairScore(players, g1, lookup) + groupPairScore(players, g2, lookup);
        if (score < minScore) {
            minScore = score;
            bestSplits = [[g1, g2]];
        } else if (score === minScore) {
            bestSplits.push([g1, g2]);
        }
    }

    const pick = bestSplits[Math.floor(Math.random() * bestSplits.length)];
    return [pick[0].map((i) => players[i]), pick[1].map((i) => players[i])];
}
