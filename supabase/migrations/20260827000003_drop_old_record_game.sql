-- Drop the old record_game overload that does not accept p_forfeited.
DROP FUNCTION IF EXISTS record_game(UUID[], INTEGER[], INTEGER[], NUMERIC[], UUID, UUID, DATE);
