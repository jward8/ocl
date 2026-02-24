import { select } from "@inquirer/prompts";
import * as readline from "readline/promises";
import { supabase } from "./supabaseClient";
import { Player } from "./types";
import { displayRecords, displayMatchups } from "./display";
import { generateMatchups } from "./matchmaking";
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
    const { data, error } = await supabase.from("players").select("*");

    if (error) {
        console.error("Error fetching players:", error.message);
        process.exit(1);
    }

    return data.map((row: any) => ({
        ...row,
        average_placement: Number(row.average_placement),
    }));
}

async function waitForEnter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    await rl.question("\nPress Enter to return to menu...");
    rl.close();
}

async function viewPlayerStats() {
    const players = await fetchPlayers();
    displayRecords(players);
    await waitForEnter();
}

async function viewLeaderboard() {
    const players = await fetchPlayers();
    const sorted = [...players].sort((a, b) => b.points - a.points);

    console.log("\n=== Leaderboard ===\n");
    sorted.forEach((p, i) => {
        console.log(
            `  ${i + 1}. ${p.name.padEnd(12)} ${String(p.points).padStart(4)} pts | ${String(p.victory_points).padStart(3)} VP | ${p.average_placement.toFixed(1)} avg`
        );
    });
    console.log();
    await waitForEnter();
}

async function generateMatchupsAction() {
    const players = await fetchPlayers();

    if (players.length !== 8) {
        console.error(`Expected 8 players, got ${players.length}`);
        await waitForEnter();
        return;
    }

    const [group1, group2] = generateMatchups(players);
    console.log();
    displayMatchups(group1);
    displayMatchups(group2);
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
            case "exit":
                console.log("Goodbye!");
                return;
        }
    }
}
