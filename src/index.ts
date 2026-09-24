import { recordGame } from "./gameRecorder";
import { runMenu } from "./menu";

async function main() {
    const command = process.argv[2];

    if (command === "add-game") {
        await recordGame();
        return;
    }

    await runMenu();
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
