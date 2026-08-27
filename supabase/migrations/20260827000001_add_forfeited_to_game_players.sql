-- Track which players forfeited a game.
ALTER TABLE game_players
ADD COLUMN IF NOT EXISTS forfeited BOOLEAN NOT NULL DEFAULT false;
