export type Player = {
    id: string;
    name: string;
};

export type PlayerStats = Player & {
    games_played: number;
    points: number;
    victory_points: number;
    average_placement: number;
    forfeits: number;
};

export type PlayerPairing = {
    player_a_id: string;
    player_b_id: string;
    games_together: number;
};

export type PairingLookup = Map<string, number>;
