-- Replicates the app's tie-sharing placement point logic.
-- Placement points arrays:
--   4 players: [7, 5, 3, 1]
--   3 players: [7, 5, 3]
-- Ties share the average of the positions they span.
CREATE OR REPLACE FUNCTION compute_placement_points(scores INTEGER[])
RETURNS NUMERIC[] AS $$
DECLARE
  player_count INTEGER := array_length(scores, 1);
  points_arr INTEGER[];
  result NUMERIC[];
  sorted_indices INTEGER[];
  i INTEGER;
  j INTEGER;
  k INTEGER;
  tie_count INTEGER;
  total_pts NUMERIC;
  shared_pts NUMERIC;
BEGIN
  IF player_count IS NULL OR player_count = 0 THEN
    RETURN '{}';
  END IF;

  IF player_count = 3 THEN
    points_arr := ARRAY[7, 5, 3];
  ELSE
    points_arr := ARRAY[7, 5, 3, 1];
  END IF;

  result := array_fill(0, ARRAY[player_count]);

  -- Indices sorted by score descending
  SELECT array_agg(idx ORDER BY score DESC)
  INTO sorted_indices
  FROM unnest(scores) WITH ORDINALITY AS t(score, idx);

  i := 1;
  WHILE i <= player_count LOOP
    j := i + 1;
    WHILE j <= player_count AND scores[sorted_indices[j]] = scores[sorted_indices[i]] LOOP
      j := j + 1;
    END LOOP;
    tie_count := j - i;

    total_pts := 0;
    FOR k IN i..(j - 1) LOOP
      total_pts := total_pts + points_arr[k];
    END LOOP;
    shared_pts := total_pts / tie_count;

    FOR k IN i..(j - 1) LOOP
      result[sorted_indices[k]] := shared_pts;
    END LOOP;

    i := j;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
