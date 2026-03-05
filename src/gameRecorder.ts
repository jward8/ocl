import { checkbox, input, select, confirm } from "@inquirer/prompts";
import { supabase } from "./supabaseClient";
import { Player } from "./types";

const PLACEMENT_POINTS_4 = [7, 5, 3, 1];
const PLACEMENT_POINTS_3 = [7, 5, 3];

async function fetchPlayers(): Promise<Player[]> {
    const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("name");

    if (error) {
        console.error("Error fetching players:", error.message);
        process.exit(1);
    }

    return data.map((row: any) => ({
        ...row,
        average_placement: Number(row.average_placement),
    }));
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
            message: `VP score for ${player.name}:`,
            validate(val) {
                const n = Number(val);
                if (isNaN(n) || !Number.isInteger(n) || n < 2 || n > 11) {
                    return "Enter an integer between 2 and 11.";
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
 */
function calculatePlacementPoints(
    scores: number[],
    playerCount: number
): { points: number[]; placements: number[] } {
    const placementPoints =
        playerCount === 3 ? PLACEMENT_POINTS_3 : PLACEMENT_POINTS_4;

    const indexed = scores.map((score, i) => ({ score, i }));
    indexed.sort((a, b) => b.score - a.score);

    if (indexed[0].score === indexed[1].score) {
        throw new Error("Two players cannot tie for 1st place.");
    }

    const points = new Array(playerCount).fill(0);
    const placements = new Array(playerCount).fill(0);

    let pos = 0;
    while (pos < playerCount) {
        let tieEnd = pos + 1;
        while (
            tieEnd < playerCount &&
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
        console.log(
            `  ${entry.placement}${suffix}: ${entry.player.name} — ${entry.score} VP — ${entry.pts} pts`
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

async function updatePlayerStats(
    selected: Player[],
    allPlayers: Player[],
    scores: number[],
    points: number[],
    placements: number[]
) {
    const playerIndexMap = new Map<string, number>();
    allPlayers.forEach((p, i) => playerIndexMap.set(p.id, i));

    for (let i = 0; i < selected.length; i++) {
        const player = selected[i];

        const newGamesPlayed = player.games_played + 1;
        const newVictoryPoints = player.victory_points + scores[i];
        const newPoints = player.points + points[i];
        const newAvgPlacement =
            (player.average_placement * player.games_played + placements[i]) /
            newGamesPlayed;

        const newHistory = [...player.history];
        for (let j = 0; j < selected.length; j++) {
            if (j === i) continue;
            const opponentIdx = playerIndexMap.get(selected[j].id)!;
            newHistory[opponentIdx] += 1;
        }

        const { error: updateError } = await supabase
            .from("players")
            .update({
                games_played: newGamesPlayed,
                victory_points: newVictoryPoints,
                points: newPoints,
                average_placement: newAvgPlacement,
                history: newHistory,
            })
            .eq("id", player.id);

        if (updateError) {
            console.error(
                `Error updating ${player.name}:`,
                updateError.message
            );
            process.exit(1);
        }
    }
}

export async function recordGame() {
    const allPlayers = await fetchPlayers();

    // Select players
    const selected = await selectPlayers(allPlayers);
    console.log(`\nSelected: ${selected.map((p) => p.name).join(", ")}\n`);

    // Get VP scores
    const scores = await promptVictoryPoints(selected);

    // Validate no tie for 1st
    const sortedScores = [...scores].sort((a, b) => b - a);
    if (sortedScores[0] === sortedScores[1]) {
        console.error("Error: Two players cannot tie for 1st place.");
        return;
    }

    // Calculate placements and points
    const { points, placements } = calculatePlacementPoints(
        scores,
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

    // Insert game row
    const { error: gameError } = await supabase.from("games").insert({
        players: selected.map((p) => p.id),
        scores,
        placements,
        largest_army: largestArmy,
        longest_road: longestRoad,
        played_at: playedAt,
    });

    if (gameError) {
        console.error("Error inserting game:", gameError.message);
        process.exit(1);
    }

    // Update player stats
    await updatePlayerStats(selected, allPlayers, scores, points, placements);

    console.log("Game saved successfully!");
}
