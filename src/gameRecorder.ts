import { checkbox, input, select, confirm } from "@inquirer/prompts";
import { supabase } from "./supabaseClient";
import { Player } from "./types";

const PLACEMENT_POINTS_4 = [7, 5, 3, 1];
const PLACEMENT_POINTS_3 = [7, 5, 3];

async function fetchPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
        .from("players")
        .select("id, name")
        .order("name");

    if (error) {
        console.error("Error fetching players:", error.message);
        process.exit(1);
    }

    return data;
}

async function selectPlayers(allPlayers: Player[]): Promise<Player[]> {
    const selected = await checkbox({
        message: "Select players (3 or 4):",
        choices: allPlayers.map((p) => ({ name: p.name, value: p })),
        validate(items) {
            if (items.length < 3 || items.length > 4) {
                return "Select exactly 3 or 4 players.";
            }
            return true;
        },
    });

    return selected;
}

async function promptVictoryPoints(selected: Player[]): Promise<number[]> {
    const scores: number[] = [];
    for (const player of selected) {
        const answer = await input({
            message: `VP score for ${player.name} (-1 for forfeit):`,
            validate(val) {
                const n = Number(val);
                if (isNaN(n) || !Number.isInteger(n) || n < -1 || n === 0 || n === 1 || n > 11) {
                    return "Enter an integer between 2 and 11, or -1 for a forfeit.";
                }
                return true;
            },
        });
        scores.push(Number(answer));
    }
    return scores;
}

/**
 * Calculate placement points based on VP scores.
 * Points arrays differ by player count:
 *   4 players: [7, 5, 3, 1]
 *   3 players: [7, 5, 3]
 *
 * Ties share the average of the positions they span.
 * No ties for 1st allowed.
 *
 * Forfeited players (score === -1) are always ranked below non-forfeited
 * players, receive last-place placement, and earn 0 placement points.
 */
function calculatePlacementPoints(
    scores: number[],
    forfeited: boolean[],
    playerCount: number
): { points: number[]; placements: number[] } {
    const nonForfeitedCount = forfeited.filter((f) => !f).length;
    if (nonForfeitedCount === 0) {
        throw new Error("At least one player must not forfeit.");
    }

    const placementPoints =
        playerCount === 3 ? PLACEMENT_POINTS_3 : PLACEMENT_POINTS_4;

    const indexed = scores
        .map((score, i) => ({ score, i, forfeited: forfeited[i] }))
        .filter((entry) => !entry.forfeited);
    indexed.sort((a, b) => b.score - a.score);

    if (indexed.length >= 2 && indexed[0].score === indexed[1].score) {
        throw new Error("Two players cannot tie for 1st place.");
    }

    const points = new Array(playerCount).fill(0);
    const placements = new Array(playerCount).fill(0);

    let pos = 0;
    while (pos < indexed.length) {
        let tieEnd = pos + 1;
        while (
            tieEnd < indexed.length &&
            indexed[tieEnd].score === indexed[pos].score
        ) {
            tieEnd++;
        }
        const tieCount = tieEnd - pos;

        let totalPts = 0;
        for (let k = pos; k < tieEnd; k++) {
            totalPts += placementPoints[k];
        }
        const sharedPts = totalPts / tieCount;
        const placement = pos + 1;

        for (let k = pos; k < tieEnd; k++) {
            points[indexed[k].i] = sharedPts;
            placements[indexed[k].i] = placement;
        }

        pos = tieEnd;
    }

    const forfeitPlacement = nonForfeitedCount + 1;
    for (let i = 0; i < playerCount; i++) {
        if (forfeited[i]) {
            points[i] = -1;
            placements[i] = forfeitPlacement;
        }
    }

    return { points, placements };
}

async function promptBonusHolder(
    selected: Player[],
    label: string
): Promise<string | null> {
    const answer = await select({
        message: `${label}:`,
        choices: [
            { name: "None", value: null as string | null },
            ...selected.map((p) => ({ name: p.name, value: p.id as string | null })),
        ],
    });

    return answer;
}

async function promptPlayedAt(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);

    const answer = await input({
        message: "Date played (YYYY-MM-DD):",
        default: today,
        validate(val) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                return "Use YYYY-MM-DD format.";
            }
            const parsed = new Date(val + "T00:00:00");
            if (isNaN(parsed.getTime())) {
                return "Invalid date.";
            }
            return true;
        },
    });

    return answer;
}

function displayGameSummary(
    selected: Player[],
    scores: number[],
    points: number[],
    placements: number[],
    forfeited: boolean[],
    largestArmy: string | null,
    longestRoad: string | null,
    playedAt: string
) {
    console.log("\n=== Game Summary ===");
    console.log(`  Date: ${playedAt}`);

    const indexed = selected.map((p, i) => ({
        player: p,
        score: scores[i],
        pts: points[i],
        placement: placements[i],
        forfeited: forfeited[i],
    }));
    indexed.sort((a, b) => a.placement - b.placement);

    for (const entry of indexed) {
        const suffix =
            entry.placement === 1
                ? "st"
                : entry.placement === 2
                  ? "nd"
                  : entry.placement === 3
                    ? "rd"
                    : "th";
        const scoreLabel = entry.forfeited
            ? "Forfeit"
            : `${entry.score} VP`;
        console.log(
            `  ${entry.placement}${suffix}: ${entry.player.name} — ${scoreLabel} — ${entry.pts} pts`
        );
    }

    if (largestArmy) {
        const armyPlayer = selected.find((p) => p.id === largestArmy);
        console.log(`  Largest Army: ${armyPlayer?.name}`);
    }
    if (longestRoad) {
        const roadPlayer = selected.find((p) => p.id === longestRoad);
        console.log(`  Longest Road: ${roadPlayer?.name}`);
    }
    console.log();
}

export async function recordGame() {
    const allPlayers = await fetchPlayers();

    // Select players
    const selected = await selectPlayers(allPlayers);
    console.log(`\nSelected: ${selected.map((p) => p.name).join(", ")}\n`);

    // Get VP scores (-1 means forfeit)
    const rawScores = await promptVictoryPoints(selected);
    const forfeited = rawScores.map((score) => score === -1);
    const scores = rawScores.map((score, i) =>
        forfeited[i] ? 0 : score
    );

    try {
        // Calculate placements and points
        const { points, placements } = calculatePlacementPoints(
            scores,
            forfeited,
            selected.length
        );

        // Bonus holders
        const largestArmy = await promptBonusHolder(selected, "Largest Army");
        const longestRoad = await promptBonusHolder(selected, "Longest Road");

        // Date played
        const playedAt = await promptPlayedAt();

        // Summary
        displayGameSummary(
            selected,
            scores,
            points,
            placements,
            forfeited,
            largestArmy,
            longestRoad,
            playedAt
        );

        // Confirm
        const shouldSave = await confirm({ message: "Save this game?" });
        if (!shouldSave) {
            console.log("Game discarded.");
            return;
        }

        // Save atomically via RPC
        const { error } = await supabase.rpc("record_game", {
            p_player_ids: selected.map((p) => p.id),
            p_scores: scores,
            p_placements: placements,
            p_placement_points: points,
            p_largest_army: largestArmy,
            p_longest_road: longestRoad,
            p_played_at: playedAt,
            p_forfeited: forfeited,
        });

        if (error) {
            console.error("Error saving game:", error.message);
            process.exit(1);
        }

        console.log("Game saved successfully!");
    } catch (err: any) {
        console.error(`Error: ${err.message}`);
    }
}
