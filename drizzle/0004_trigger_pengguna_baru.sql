CREATE OR REPLACE FUNCTION public.tangani_pengguna_baru()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_nama text := NULLIF(btrim(v_meta->>'nama'), '');
  v_peran_meta text := v_meta->>'peran';
  v_peran public.peran;
BEGIN
  -- Serialisasi agar dua pendaftaran bersamaan tidak sama-sama menjadi pemilik pertama.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('public.tangani_pengguna_baru'));

  IF NOT EXISTS (SELECT 1 FROM public.pengguna WHERE peran = 'pemilik') THEN
    v_peran := 'pemilik';
  ELSIF v_peran_meta IN ('pemilik', 'kasir') THEN
    v_peran := v_peran_meta::public.peran;
  ELSE
    v_peran := 'kasir';
  END IF;

  INSERT INTO public.pengguna (id, email, nama, peran)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(v_nama, pg_catalog.split_part(NEW.email, '@', 1)),
    v_peran
  );

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.tangani_pengguna_baru() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS saat_pengguna_baru ON auth.users;
--> statement-breakpoint
CREATE TRIGGER saat_pengguna_baru
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tangani_pengguna_baru();
