CREATE TABLE IF NOT EXISTS ticket_pid_counters (
  year_month TEXT PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION next_ticket_pid() RETURNS TEXT AS $$
DECLARE
  current_period TEXT;
  next_value INTEGER;
BEGIN
  current_period := TO_CHAR(NOW(), 'YYYYMM');

  LOOP
    UPDATE ticket_pid_counters
    SET counter = counter + 1,
        updated_at = NOW()
    WHERE year_month = current_period
    RETURNING counter INTO next_value;

    IF FOUND THEN
      EXIT;
    END IF;

    BEGIN
      INSERT INTO ticket_pid_counters (year_month, counter)
      VALUES (current_period, 1)
      RETURNING counter INTO next_value;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Another transaction inserted the period; retry the update.
    END;
  END LOOP;

  RETURN current_period || '-' || LPAD(next_value::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
