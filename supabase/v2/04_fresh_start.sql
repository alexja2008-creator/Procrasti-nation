-- A fresh start at cutover (Alex, 2026-10-12): every account is deleted, Alex's
-- included, so everyone meets v2 through the Citizenship Application. v1 has
-- one real user (Alex), so nothing carries over and 02_backfill.sql isn't run.
--
-- Run in production's SQL Editor at cutover, after 01_schema.sql and right
-- before v2 merges. PERMANENT: nothing brings the accounts back.
-- First, in Stripe's dashboard, cancel any subscription still billing: this
-- deletes rows, it doesn't stop a charge.
--
-- Every table pointing at a person deletes its rows with the account (ON DELETE
-- CASCADE, tested on production's structure in test/migration.test.mjs). As a
-- precaution the schools tables' assignments go first: an assignment's link to
-- its template is ON DELETE RESTRICT, which could stop the cascade depending
-- on the order Postgres deletes them in. If anything of anyone's is left, it
-- stops and nothing is deleted.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.assignments') IS NOT NULL THEN
    DELETE FROM public.assignments;
  END IF;
END $$;

DELETE FROM auth.users;

DO $$
DECLARE
  ref RECORD;
  n BIGINT;
BEGIN
  -- Every (table, column) with a foreign key to auth.users, so tables added later are covered too.
  FOR ref IN
    SELECT c.conrelid::regclass::text AS tbl, a.attname AS col
      FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
     WHERE c.contype = 'f' AND c.confrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE %I IS NOT NULL', ref.tbl, ref.col) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION '% row(s) left in %.%: nothing was deleted', n, ref.tbl, ref.col;
    END IF;
  END LOOP;

  -- The first passport after the fresh start is citizen 000001.
  IF to_regclass('public.citizen_number_seq') IS NOT NULL THEN
    PERFORM setval('public.citizen_number_seq', 1, false);
  END IF;
END $$;

COMMIT;

SELECT (SELECT count(*) FROM auth.users) AS accounts_left;
