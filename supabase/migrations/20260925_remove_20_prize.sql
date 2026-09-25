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

commit;
