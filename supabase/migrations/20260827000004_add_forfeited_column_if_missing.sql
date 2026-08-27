-- Ensure game_players.forfeited exists (idempotent in case the original migration was not applied).
ALTER TABLE game_players
ADD COLUMN IF NOT EXISTS forfeited BOOLEAN NOT NULL DEFAULT false;
