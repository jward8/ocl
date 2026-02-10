import { Player } from "./types";

export function displayRecords(players: Player[]) {
    players.forEach((player) => {
        console.log(player.name);
        console.log(`${player.games_played} ${player.games_played > 1 ? 'games' : 'game'} played with average placement of ${player.average_placement}.`);
        console.log(`Total points: ${player.points}.`)
        console.log(`Total victory points: ${player.victory_points}.`)
        console.log()
    })
}

export function displayMatchups(group: Player[]) {
    console.log("-------------------");
    console.log("New group will be:");
    group.forEach(player => console.log(`${player.name} (${player.points} | ${player.victory_points})`));
    console.log("-------------------");
}
