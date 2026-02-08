import { supabase } from "./supabaseClient";

type player = {
    name: string,
    games_played: number,
    history: number[],
    points: number,
    victory_points: number,
    average_placement: number
}

type historyIndex = {
    availability: number,
    playerIndex: number
}

function displayRecords(players: player[]) {
    players.forEach((player) => {
        console.log(player.name);
        console.log(`${player.games_played} ${player.games_played > 1 ? 'games' : 'game'} played with average placement of ${player.average_placement}.`);
        console.log(`Total points: ${player.points}.`)
        console.log(`Total victory points: ${player.victory_points}.`)
        console.log()
    })
}

function displayMatchups(group: player[]) {
    console.log("-------------------");
    console.log("New group will be:");
    group.forEach(player => console.log(`${player.name} (${player.points} | ${player.victory_points})`));
    console.log("-------------------");
}

function gatherMatchups(players: player[]){
    let playerOne = players.reduce((min, player) =>
        player.games_played < min.games_played ? player : min
    );

    let availableHistory = playerOne.history.map((history, index) => {
        return {
            availability: history,
            playerIndex: index
        }
    })

    const firstGroup: player[] = generateGroup(players, [playerOne], availableHistory);
    const secondGroup: player[] = players.filter((player) => !firstGroup.includes(player));

    displayMatchups(firstGroup);
    displayMatchups(secondGroup);
}

function findAllWithMinAvailability<T extends {availability: number}>(array: T[], threshold: number = -1): T[] {

    const filtered = array.filter(obj => obj.availability > threshold);

    if (filtered.length === 0) return [];

    const minAvailability = Math.min(...filtered.map(history => history.availability));
    return filtered.filter(obj => obj.availability === minAvailability);
}

function generateGroup(players: player[], group: player[], groupHistory: historyIndex[]): player[] {
    if (group.length === 4) {
        return group;
    }

    let cloneGroupHistory = [...groupHistory];

    const availablePlayerHistory = findAllWithMinAvailability(cloneGroupHistory);

    const randomIndex = Math.floor(Math.random() * availablePlayerHistory.length);
    const nextIndex = availablePlayerHistory.length === 1
        ? availablePlayerHistory[0].playerIndex
        : availablePlayerHistory[randomIndex].playerIndex;

    if (!nextIndex) return [];

    const nextPlayer = players[nextIndex]
    const newGroup = [...group, nextPlayer]
    const newHistory = nextPlayer.history.map((availability, playerIndex) => {
        const groupEntry = groupHistory.find(h => h.playerIndex === playerIndex);
        const groupAvailability = groupEntry?.availability ?? -1;

        let newAvailability = (availability === -1 || groupAvailability === -1)
            ? -1
            : ((availability + (groupAvailability * group.length)) / newGroup.length)
        return {
            availability: newAvailability,
            playerIndex: playerIndex,
        }
    })

    return generateGroup(players, newGroup, newHistory);
}

async function main() {
    const { data, error } = await supabase.from('players').select('*');

    if (error) {
        console.error('Error fetching players:', error.message);
        process.exit(1);
    }

    const players: player[] = data.map((row: any) => ({
        ...row,
        average_placement: Number(row.average_placement)
    }));

    console.log("===============")
    gatherMatchups(players);
}

main();
