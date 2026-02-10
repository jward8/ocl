import * as readline from "readline/promises";
import { supabase } from "./supabaseClient";
import { Player } from "./types";

const PLACEMENT_POINTS = [7, 5, 3, 1];

function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}

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

function displayPlayerList(players: Player[]) {
    console.log("\nPlayers:");
    players.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
    });
    console.log();
}

async function promptPlayerSelection(
    rl: readline.Interface,
    players: Player[]
): Promise<Player[]> {
    while (true) {
        const input = await rl.question(
            "Select 4 players by number (comma-separated, e.g. 1,3,5,7): "
        );
        const nums = input
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map(Number);

        if (nums.length !== 4) {
            console.log("Please select exactly 4 players.");
            continue;
        }

        if (nums.some((n) => isNaN(n) || n < 1 || n > players.length)) {
            console.log(`Please enter numbers between 1 and ${players.length}.`);
            continue;
        }

        if (new Set(nums).size !== 4) {
            console.log("Please select 4 different players.");
            continue;
        }

        return nums.map((n) => players[n - 1]);
    }
}

async function promptScores(
    rl: readline.Interface,
    selected: Player[]
): Promise<number[]> {
    const scores: number[] = [];
    for (const player of selected) {
        while (true) {
            const input = await rl.question(`  VP score for ${player.name}: `);
            const score = Number(input.trim());
            if (isNaN(score) || !Number.isInteger(score) || score < 0) {
                console.log("Please enter a valid non-negative integer.");
                continue;
            }
            scores.push(score);
            break;
        }
    }
    return scores;
}

async function promptBonusHolder(
    rl: readline.Interface,
    selected: Player[],
    label: string
): Promise<string | null> {
    while (true) {
        console.log(`\n${label}:`);
        selected.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`));
        console.log(`  0. None`);
        const input = await rl.question("Select (0 to skip): ");
        const num = Number(input.trim());

        if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > selected.length) {
            console.log(`Please enter a number between 0 and ${selected.length}.`);
            continue;
        }

        if (num === 0) return null;
        return selected[num - 1].id;
    }
}

/**
 * Calculate placement points for 4 players based on VP scores.
 * Returns an array of points in the same order as the input scores.
 *
 * Points: 1st=7, 2nd=5, 3rd=3, 4th=1
 * Ties share the average of the positions they span.
 * No ties for 1st allowed.
 */
function calculatePlacementPoints(scores: number[]): {
    points: number[];
    placements: number[];
} {
    // Create indexed entries and sort descending by score
    const indexed = scores.map((score, i) => ({ score, i }));
    indexed.sort((a, b) => b.score - a.score);

    // Check no tie for 1st
    if (indexed[0].score === indexed[1].score) {
        throw new Error("Two players cannot tie for 1st place.");
    }

    const points = new Array(4).fill(0);
    const placements = new Array(4).fill(0);

    let pos = 0;
    while (pos < 4) {
        // Find how many players share this score
        let tieEnd = pos + 1;
        while (tieEnd < 4 && indexed[tieEnd].score === indexed[pos].score) {
            tieEnd++;
        }
        const tieCount = tieEnd - pos;

        // Average the placement points for the tied positions
        let totalPts = 0;
        for (let k = pos; k < tieEnd; k++) {
            totalPts += PLACEMENT_POINTS[k];
        }
        const sharedPts = totalPts / tieCount;
        const placement = pos + 1; // 1-indexed placement

        for (let k = pos; k < tieEnd; k++) {
            points[indexed[k].i] = sharedPts;
            placements[indexed[k].i] = placement;
        }

        pos = tieEnd;
    }

    return { points, placements };
}

export async function recordGame() {
    const rl = createRL();

    try {
        const allPlayers = await fetchPlayers();

        if (allPlayers.length !== 8) {
            console.error(`Expected 8 players, got ${allPlayers.length}`);
            process.exit(1);
        }

        displayPlayerList(allPlayers);

        // Select 4 players
        const selected = await promptPlayerSelection(rl, allPlayers);
        console.log(
            `\nSelected: ${selected.map((p) => p.name).join(", ")}\n`
        );

        // Get VP scores
        console.log("Enter victory point scores:");
        const scores = await promptScores(rl, selected);

        // Validate no tie for 1st before proceeding
        const sortedScores = [...scores].sort((a, b) => b - a);
        if (sortedScores[0] === sortedScores[1]) {
            console.error("Error: Two players cannot tie for 1st place.");
            process.exit(1);
        }

        // Bonus holders
        const largestArmy = await promptBonusHolder(rl, selected, "Largest Army");
        const longestRoad = await promptBonusHolder(rl, selected, "Longest Road");

        // Calculate points
        const { points, placements } = calculatePlacementPoints(scores);

        // Show summary
        console.log("\n=== Game Summary ===");
        const indexed = selected.map((p, i) => ({
            player: p,
            score: scores[i],
            pts: points[i],
            placement: placements[i],
        }));
        indexed.sort((a, b) => a.placement - b.placement);

        for (const entry of indexed) {
            const suffix = entry.placement === 1 ? "st" : entry.placement === 2 ? "nd" : entry.placement === 3 ? "rd" : "th";
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
        const confirm = await rl.question("Save this game? (y/n): ");
        if (confirm.trim().toLowerCase() !== "y") {
            console.log("Game discarded.");
            return;
        }

        // Insert game row
        const { error: gameError } = await supabase.from("games").insert({
            players: selected.map((p) => p.id),
            scores,
            largest_army: largestArmy,
            longest_road: longestRoad,
        });

        if (gameError) {
            console.error("Error inserting game:", gameError.message);
            process.exit(1);
        }

        // Build a map of player name -> index in the allPlayers array (ordered by name)
        const playerIndexMap = new Map<string, number>();
        allPlayers.forEach((p, i) => playerIndexMap.set(p.id, i));

        // Update each selected player's stats
        for (let i = 0; i < selected.length; i++) {
            const player = selected[i];
            const playerIdx = playerIndexMap.get(player.id)!;

            const newGamesPlayed = player.games_played + 1;
            const newVictoryPoints = player.victory_points + scores[i];
            const newPoints = player.points + points[i];
            const newAvgPlacement =
                (player.average_placement * player.games_played + placements[i]) /
                newGamesPlayed;

            // Update history: increment index for each opponent
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

        console.log("Game saved successfully!");
    } finally {
        rl.close();
    }
}
