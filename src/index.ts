import { supabase } from "./supabaseClient";
import { Player } from "./types";
import { generateMatchups } from "./matchmaking";
import { displayMatchups } from "./display";
import { recordGame } from "./gameRecorder";

async function main() {
    const command = process.argv[2];

    if (command === "add-game") {
        await recordGame();
        return;
    }

    const { data, error } = await supabase.from('players').select('*');

    if (error) {
        console.error('Error fetching players:', error.message);
        process.exit(1);
    }

    const players: Player[] = data.map((row: any) => ({
        ...row,
        average_placement: Number(row.average_placement)
    }));

    if (players.length !== 8) {
        console.error(`Expected 8 players, got ${players.length}`);
        process.exit(1);
    }

    console.log("===============");
    const [group1, group2] = generateMatchups(players);
    displayMatchups(group1);
    displayMatchups(group2);
}

main();
