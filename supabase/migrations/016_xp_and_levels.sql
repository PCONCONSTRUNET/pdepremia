-- 1. Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xp NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rank_level INTEGER DEFAULT 1;

-- 2. Create function to add XP based on paid orders
CREATE OR REPLACE FUNCTION public.add_xp_from_order()
RETURNS trigger AS $$
DECLARE
    v_user_id UUID;
    v_total_amount NUMERIC;
    v_current_rank TEXT;
    v_current_level INTEGER;
    v_current_xp NUMERIC;
    v_xp_to_add NUMERIC;
    v_new_xp NUMERIC;
    v_levels_gained INTEGER;
    v_new_level INTEGER;
    v_new_rank TEXT;
BEGIN
    -- Only trigger on status change to 'paid'
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        v_user_id := NEW.user_id;
        v_total_amount := NEW.total_amount;

        -- Get current profile
        SELECT rank, COALESCE(rank_level, 1), COALESCE(xp, 0.00) 
        INTO v_current_rank, v_current_level, v_current_xp
        FROM public.profiles
        WHERE id = v_user_id;

        -- Calculate XP based on Rank
        IF v_current_rank = 'P Starter' THEN
            v_xp_to_add := v_total_amount / 1.0;  -- R$ 1 = 1 XP
        ELSIF v_current_rank = 'P Hunter' THEN
            v_xp_to_add := v_total_amount / 2.0;  -- R$ 2 = 1 XP
        ELSIF v_current_rank = 'P Master' THEN
            v_xp_to_add := v_total_amount / 5.0;  -- R$ 5 = 1 XP
        ELSIF v_current_rank = 'P Legend' THEN
            v_xp_to_add := v_total_amount / 10.0; -- R$ 10 = 1 XP
        ELSE
            -- Fallback
            v_xp_to_add := v_total_amount / 1.0;
        END IF;

        v_new_xp := v_current_xp + v_xp_to_add;
        v_levels_gained := FLOOR(v_new_xp / 100.0);
        v_new_xp := MOD(v_new_xp, 100.0);
        v_new_level := v_current_level + v_levels_gained;
        v_new_rank := COALESCE(v_current_rank, 'P Starter');

        -- Rank progression logic
        WHILE v_new_level > 5 LOOP
            -- Move to next rank
            IF v_new_rank = 'P Starter' THEN
                v_new_rank := 'P Hunter';
                v_new_level := v_new_level - 5;
            ELSIF v_new_rank = 'P Hunter' THEN
                v_new_rank := 'P Master';
                v_new_level := v_new_level - 5;
            ELSIF v_new_rank = 'P Master' THEN
                v_new_rank := 'P Legend';
                v_new_level := v_new_level - 5;
            ELSE
                -- P Legend capped at level 5
                v_new_rank := 'P Legend';
                v_new_level := 5;
                v_new_xp := 100.0; -- Maxed out
                EXIT;
            END IF;
        END LOOP;

        -- Update profile
        UPDATE public.profiles
        SET 
            xp = v_new_xp,
            rank_level = v_new_level,
            rank = v_new_rank,
            updated_at = NOW()
        WHERE id = v_user_id;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on orders table
DROP TRIGGER IF EXISTS trigger_add_xp_from_order ON public.orders;
CREATE TRIGGER trigger_add_xp_from_order
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.add_xp_from_order();
