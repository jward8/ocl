import { Player } from "./types";

/**
 * Sum history values for all 6 pairwise combinations within a 4-player group.
 * Lower score = fresher matchups (fewer past games between these players).
 */
function groupPairScore(players: Player[], groupIndices: number[]): number {
    let score = 0;
    for (let i = 0; i < groupIndices.length; i++) {
        for (let j = i + 1; j < groupIndices.length; j++) {
            const a = groupIndices[i];
            const b = groupIndices[j];
            score += players[a].history[b];
            score += players[b].history[a];
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

/**
 * Score every possible split of 8 players into two groups of 4.
 * Pick randomly among ties at the minimum score.
 */
export function generateMatchups(players: Player[]): [Player[], Player[]] {
    const splits = generateAllSplits(players.length);

    let minScore = Infinity;
    let bestSplits: [number[], number[]][] = [];

    for (const [g1, g2] of splits) {
        const score = groupPairScore(players, g1) + groupPairScore(players, g2);
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
