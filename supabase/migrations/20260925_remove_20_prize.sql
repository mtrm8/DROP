begin;

-- Clear persisted assignments first so used codes can roll from the revised pool.
update public.drop_codes
   set prize_id = null,
       prize_rolled_at = null
 where prize_id in (
   select id
     from public.drop_prizes
    where amount = 20 or id = 'cash-20'
 );

-- Remove the retired tier and its weight from the server-side roll pool.
delete from public.drop_prizes
 where amount = 20 or id = 'cash-20';

update public.drop_prizes
   set chance = case id
     when 'cash-30' then '43.1%'
     when 'cash-50' then '27.59%'
     when 'cash-100' then '17.24%'
     when 'cash-200' then '8.62%'
     when 'cash-350' then '2.59%'
     when 'cash-500' then '0.86%'
     else chance
   end
 where id in ('cash-30', 'cash-50', 'cash-100', 'cash-200', 'cash-350', 'cash-500');

commit;
