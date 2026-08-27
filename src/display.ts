import { PlayerStats } from "./types";
import { ScoredMatchup } from "./matchmaking";

export function displayRecords(players: PlayerStats[]) {
    players.forEach((player) => {
        console.log(player.name);
        console.log(`${player.games_played} ${player.games_played > 1 ? 'games' : 'game'} played with average placement of ${player.average_placement}.`);
        console.log(`Total points: ${player.points}.`)
        console.log(`Total victory points: ${player.victory_points}.`)
        if (player.forfeits > 0) {
            console.log(`${player.forfeits} ${player.forfeits > 1 ? 'forfeits' : 'forfeit'}.`)
        }
        console.log()
    })
}

export function displayAllMatchupScores(matchups: ScoredMatchup[]) {
    const bestCount = matchups.filter((m) => m.isBest).length;
    console.log(`\n=== All Possible Matchups (${matchups.length} total, ${bestCount} tied best) ===\n`);

    let lastScore = -1;
    matchups.forEach((m, i) => {
        if (i > 0 && m.score !== lastScore) console.log();
        lastScore = m.score;

        const tag = m.isBest ? "  <-- BEST" : "";
        const g1 = m.group1.map((p) => p.name).join(", ");
        const g2 = m.group2.map((p) => p.name).join(", ");
        console.log(`[${String(i + 1).padStart(2)}] Score: ${String(m.score).padStart(3)}${tag}`);
        console.log(`      G1: ${g1}`);
        console.log(`      G2: ${g2}`);
    });
    console.log();
}

export function displayMatchups(group: PlayerStats[]) {
    console.log("-------------------");
    console.log("New group will be:");
    group.forEach(player => console.log(`${player.name} (${player.points} | ${player.victory_points})`));
    console.log("-------------------");
}
