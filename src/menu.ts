import { select, input } from "@inquirer/prompts";
import { supabase } from "./supabaseClient";
import { Player, PlayerStats, PlayerPairing } from "./types";
import { displayRecords, displayMatchups, displayAllMatchupScores } from "./display";
import { generateMatchups, getAllMatchupScores, buildPairingLookup } from "./matchmaking";
import { recordGame } from "./gameRecorder";

const BANNER = `
  ██████╗  ██████╗██╗
 ██╔═══██╗██╔════╝██║
 ██║   ██║██║     ██║
 ██║   ██║██║     ██║
 ╚██████╔╝╚██████╗███████╗
  ╚═════╝  ╚═════╝╚══════╝
`;

async function fetchPlayers(): Promise<Player[]> {
    const { data, error } = await supabase.from("players").select("id, name");

    if (error) {
        console.error("Error fetching players:", error.message);
        process.exit(1);
    }

    return data;
}

async function fetchPlayerStats(): Promise<PlayerStats[]> {
    const { data, error } = await supabase.from("player_stats").select("*");

    if (error) {
        console.error("Error fetching player stats:", error.message);
        process.exit(1);
    }

    return data.map((row: any) => ({
        ...row,
        games_played: Number(row.games_played),
        points: Number(row.points),
        victory_points: Number(row.victory_points),
        average_placement: Number(row.average_placement),
        forfeits: Number(row.forfeits),
    }));
}

async function fetchPairings() {
    const { data, error } = await supabase.from("player_pairings").select("*");

    if (error) {
        console.error("Error fetching pairings:", error.message);
        process.exit(1);
    }

    return data as PlayerPairing[];
}

async function waitForEnter() {
    await input({ message: "Press Enter to return to menu..." });
}

async function viewPlayerStats() {
    const players = await fetchPlayerStats();
    displayRecords(players);
    await waitForEnter();
}

async function viewLeaderboard() {
    const players = await fetchPlayerStats();
    const sorted = [...players].sort((a, b) =>
        b.points !== a.points ? b.points - a.points : b.victory_points - a.victory_points
    );

    console.log("\n=== Leaderboard ===\n");
    sorted.forEach((p, i) => {
        const forfeitLabel = p.forfeits > 0 ? ` | ${p.forfeits} FF` : "";
        console.log(
            `  ${i + 1}. ${p.name.padEnd(12)} ${String(p.points).padStart(4)} pts | ${String(p.victory_points).padStart(3)} VP | ${p.average_placement.toFixed(1)} avg${forfeitLabel}`
        );
    });
    console.log();
    await waitForEnter();
}

async function generateMatchupsAction() {
    const players = await fetchPlayerStats();

    if (players.length !== 8) {
        console.error(`Expected 8 players, got ${players.length}`);
        await waitForEnter();
        return;
    }

    const pairings = await fetchPairings();
    const lookup = buildPairingLookup(pairings);

    const [group1, group2] = generateMatchups(players, lookup);
    console.log();
    displayMatchups(group1);
    displayMatchups(group2);
    await waitForEnter();
}

async function viewAllMatchupScores() {
    const players = await fetchPlayers();

    if (players.length !== 8) {
        console.error(`Expected 8 players, got ${players.length}`);
        await waitForEnter();
        return;
    }

    const pairings = await fetchPairings();
    const lookup = buildPairingLookup(pairings);

    const scored = getAllMatchupScores(players, lookup);
    displayAllMatchupScores(scored);
    await waitForEnter();
}

async function recordGameAction() {
    await recordGame();
    await waitForEnter();
}

export async function runMenu() {
    while (true) {
        console.clear();
        console.log(BANNER);

        const action = await select({
            message: "What would you like to do?",
            choices: [
                { name: "View Player Stats", value: "stats" },
                { name: "View Leaderboard", value: "leaderboard" },
                { name: "Record Game Results", value: "record" },
                { name: "Generate Matchups", value: "matchups" },
                { name: "View All Matchup Scores", value: "all-scores" },
                { name: "Exit", value: "exit" },
            ],
        });

        console.clear();

        switch (action) {
            case "stats":
                await viewPlayerStats();
                break;
            case "leaderboard":
                await viewLeaderboard();
                break;
            case "record":
                await recordGameAction();
                break;
            case "matchups":
                await generateMatchupsAction();
                break;
            case "all-scores":
                await viewAllMatchupScores();
                break;
            case "exit":
                console.log("Goodbye!");
                return;
        }
    }
}
