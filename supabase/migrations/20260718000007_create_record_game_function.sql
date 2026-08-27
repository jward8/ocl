-- Record a game and its player results atomically.
-- Returns the new game id.
CREATE OR REPLACE FUNCTION record_game(
  p_player_ids UUID[],
  p_scores INTEGER[],
  p_placements INTEGER[],
  p_placement_points NUMERIC[],
  p_largest_army UUID DEFAULT NULL,
  p_longest_road UUID DEFAULT NULL,
  p_played_at DATE DEFAULT CURRENT_DATE,
  p_forfeited BOOLEAN[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_game_id UUID;
  v_count INTEGER := array_length(p_player_ids, 1);
  i INTEGER;
BEGIN
  IF v_count IS NULL OR v_count < 3 OR v_count > 4 THEN
    RAISE EXCEPTION 'Game must have 3 or 4 players';
  END IF;

  IF array_length(p_scores, 1) != v_count OR
     array_length(p_placements, 1) != v_count OR
     array_length(p_placement_points, 1) != v_count THEN
    RAISE EXCEPTION 'Array lengths must match';
  END IF;

  IF p_forfeited IS NOT NULL AND array_length(p_forfeited, 1) != v_count THEN
    RAISE EXCEPTION 'Forfeit array length must match player count';
  END IF;

  INSERT INTO games (played_at, largest_army, longest_road)
  VALUES (COALESCE(p_played_at, CURRENT_DATE), p_largest_army, p_longest_road)
  RETURNING id INTO v_game_id;

  FOR i IN 1..v_count LOOP
    INSERT INTO game_players (game_id, player_id, victory_points, placement, placement_points, forfeited)
    VALUES (v_game_id, p_player_ids[i], p_scores[i], p_placements[i], p_placement_points[i], COALESCE(p_forfeited[i], false));
  END LOOP;

  RETURN v_game_id;
END;
$$ LANGUAGE plpgsql;
