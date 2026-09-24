import { Player, PlayerStats } from "./types";
import { ScoredMatchup } from "./matchmaking";
import { GroupPlayResult, RivalResult, HistoricPoint } from "./stats";

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

export function displayGroupPlayChart(players: Player[], result: GroupPlayResult) {
    const { matrix, rowTotals } = result;
    const nameWidth = Math.max("Player".length, ...players.map((p) => p.name.length));
    const cellWidth = 4;

    const abbrev = (name: string) => name.slice(0, cellWidth).toUpperCase().padStart(cellWidth);
    const cell = (n: number) => String(n).padStart(cellWidth);

    console.log("\n=== Group Play Chart (games played together) ===\n");
    console.log(`${" ".repeat(nameWidth)} |${players.map((p) => abbrev(p.name)).join("")}  Total`);
    console.log(`${"-".repeat(nameWidth)}-${"-".repeat(cellWidth * players.length + 8)}`);

    players.forEach((p, i) => {
        const cells = matrix[i].map((n, j) => (i === j ? " ".repeat(cellWidth) : cell(n))).join("");
        console.log(`${p.name.padEnd(nameWidth)} |${cells}  ${String(rowTotals[i]).padStart(3)}`);
    });
    console.log();
}

export function displayBonusWinners(
    players: Player[],
    largestArmy: Map<string, number>,
    longestRoad: Map<string, number>
) {
    const nameById = new Map(players.map((p) => [p.id, p.name]));

    const render = (title: string, counts: Map<string, number>) => {
        console.log(`=== ${title} ===\n`);
        const entries = [...counts.entries()]
            .map(([id, count]) => ({ name: nameById.get(id) ?? id, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        if (entries.length === 0) {
            console.log("  None recorded.");
        } else {
            entries.forEach((e, i) => console.log(`  ${i + 1}. ${e.name} — ${e.count}`));
        }
        console.log();
    };

    console.log();
    render("Largest Army", largestArmy);
    render("Longest Road", longestRoad);
}

function formatSigned(n: number): string {
    return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

export function displayRivals(results: RivalResult[], players: Player[]) {
    const nameById = new Map(players.map((p) => [p.id, p.name]));

    console.log("\n=== Rivals (statistically worst opponent) ===\n");
    for (const r of results) {
        const name = nameById.get(r.playerId) ?? r.playerId;
        if (r.rivalId === null) {
            console.log(`  ${name}: no rival yet (needs 2+ games vs the same opponent)`);
        } else {
            const rivalName = nameById.get(r.rivalId) ?? r.rivalId;
            console.log(
                `  ${name}'s rival: ${rivalName} — ${r.gamesTogether} games, avg placement gap ${formatSigned(r.avgPlacementGap)}, avg VP gap ${formatSigned(r.avgVpGap)}`
            );
        }
    }
    console.log();
}

export function displayHistoricPositions(player: Player, trajectory: HistoricPoint[]) {
    if (trajectory.length === 0) {
        console.log(`\n${player.name} has no recorded games yet.\n`);
        return;
    }

    const maxRank = Math.max(...trajectory.map((t) => t.rank));
    const labelWidth = String(maxRank).length;

    console.log(`\n=== ${player.name}: Historic Positions ===\n`);
    for (let rank = 1; rank <= maxRank; rank++) {
        const cells = trajectory.map((t) => (t.rank === rank ? " ● " : "   ")).join("");
        console.log(`${String(rank).padStart(labelWidth)} |${cells}`);
    }
    console.log(`${" ".repeat(labelWidth)} |${trajectory.map(() => "---").join("")}`);
    console.log(`${" ".repeat(labelWidth)} |${trajectory.map((t) => String(t.week).padStart(3)).join("")}`);
    console.log();

    trajectory.forEach((t) => {
        console.log(`  Week ${String(t.week).padStart(2)} (${t.dateRange}): rank ${t.rank}`);
    });
    console.log();
}
