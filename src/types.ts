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

export type Game = {
    id: string;
    created_at: string;
    played_at: string | null;
    largest_army: string | null;
    longest_road: string | null;
};

export type GamePlayerRow = {
    game_id: string;
    player_id: string;
    victory_points: number;
    placement: number;
    placement_points: number;
    forfeited: boolean;
};
