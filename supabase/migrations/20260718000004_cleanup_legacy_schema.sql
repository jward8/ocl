-- Drop legacy array columns from games
ALTER TABLE games DROP COLUMN IF EXISTS players;
ALTER TABLE games DROP COLUMN IF EXISTS scores;
ALTER TABLE games DROP COLUMN IF EXISTS placements;

-- Set played_at default if it was just added
ALTER TABLE games ALTER COLUMN played_at SET DEFAULT CURRENT_DATE;

-- Drop derived stat columns from players; these are now computed from game_players
ALTER TABLE players DROP COLUMN IF EXISTS games_played;
ALTER TABLE players DROP COLUMN IF EXISTS history;
ALTER TABLE players DROP COLUMN IF EXISTS points;
ALTER TABLE players DROP COLUMN IF EXISTS victory_points;
ALTER TABLE players DROP COLUMN IF EXISTS average_placement;
