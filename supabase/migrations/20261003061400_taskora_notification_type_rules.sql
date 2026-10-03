insert into public.notification_rules(rule_key,name,description,category,enabled,internal_enabled,push_enabled,email_enabled,critical) values
('news','Novidades','Comunicações informativas da plataforma.','news',true,true,true,true,false),
('promotion','Promoção','Comunicações promocionais autorizadas.','promotions',true,true,true,true,false)
on conflict(rule_key) do nothing;
