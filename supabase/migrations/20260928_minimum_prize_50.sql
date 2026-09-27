-- Upgrade installations that already applied 20260927_atomic_drop_content.sql.
-- Previously awarded low-tier prizes become 50₪ rather than disappearing from
-- redeemed codes. Run once in the Supabase SQL editor before deploying the UI.
begin;

insert into public.drop_prizes (id, name, amount, chance, weight, rarity, icon)
select 'cash-50', '50 ₪', 50, '48.48%', 1600, 'uncommon', '💰'
where not exists (select 1 from public.drop_prizes where id = 'cash-50')
on conflict do nothing;

update public.drop_prizes set name = '50 ₪', amount = 50 where id = 'cash-50';

update public.drop_codes
   set prize_id = 'cash-50', prize_rolled_at = coalesce(prize_rolled_at, used_at, now())
 where prize_id in (select id from public.drop_prizes where amount < 50)
    or prize_id in ('cash-20', 'cash-30');

delete from public.drop_prizes where amount < 50 or id in ('cash-20', 'cash-30');
alter table public.drop_prizes drop constraint if exists drop_prizes_min_amount;
alter table public.drop_prizes add constraint drop_prizes_min_amount check (amount >= 50);

-- Keep any legacy chance column in sync with the new live weights.
update public.drop_prizes
   set chance = public.drop_prize_chance(id)
 where id is not null and amount >= 50 and weight > 0;

commit;
