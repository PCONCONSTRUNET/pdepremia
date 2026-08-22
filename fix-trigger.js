import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres';

const sql = `
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Allow bypass for trusted SECURITY DEFINER functions (they run as postgres/supabase_admin)
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- For normal users updating their own profile via REST client directly
  IF auth.uid() = NEW.id THEN
    IF OLD.balance IS DISTINCT FROM NEW.balance THEN
      RAISE EXCEPTION 'Not allowed to update balance directly. Use wallet endpoints.';
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Not allowed to update role.';
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Not allowed to update status.';
    END IF;
    IF OLD.xp IS DISTINCT FROM NEW.xp THEN
      RAISE EXCEPTION 'Not allowed to update xp.';
    END IF;
    IF OLD.rank_level IS DISTINCT FROM NEW.rank_level THEN
      RAISE EXCEPTION 'Not allowed to update rank_level.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Trigger fixed successfully!');
  } catch (err) {
    console.error('Error fixing trigger:', err);
  } finally {
    await client.end();
  }
}

run();
