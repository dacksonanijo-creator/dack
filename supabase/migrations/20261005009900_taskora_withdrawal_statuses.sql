alter type public.withdrawal_status add value if not exists 'review';
alter type public.withdrawal_status add value if not exists 'cancelled';
alter type public.withdrawal_status add value if not exists 'reversed';
