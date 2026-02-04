CREATE TABLE IF NOT EXISTS ticket_pid_counters (
  period CHAR(6) PRIMARY KEY,
  counter INTEGER NOT NULL
);

CREATE OR REPLACE FUNCTION next_ticket_pid() RETURNS TEXT AS $$
DECLARE
  current_period CHAR(6);
  next_value INTEGER;
BEGIN
  current_period := TO_CHAR(NOW(), 'YYYYMM');

  LOOP
    UPDATE ticket_pid_counters
    SET counter = counter + 1
    WHERE period = current_period
    RETURNING counter INTO next_value;

    IF FOUND THEN
      EXIT;
    END IF;

    BEGIN
      INSERT INTO ticket_pid_counters (period, counter)
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
