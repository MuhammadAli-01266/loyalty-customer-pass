insert into auth.users (id,email,raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','owner@cafe.test','{"full_name":"Alice Owner"}'),
 ('a0000000-0000-4000-8000-000000000002','sam@cafe.test','{"full_name":"Sam Rivera"}'),
 ('b0000000-0000-4000-8000-000000000001','bob@bakery.test','{"full_name":"Bob Baker"}'),
 ('c0000000-0000-4000-8000-000000000001','carl@mail.test','{"full_name":"Carl Mendes"}'),
 ('c0000000-0000-4000-8000-000000000002','dana@mail.test','{"full_name":"Dana Okafor"}'),
 ('e0000000-0000-4000-8000-000000000001','eve@mail.test','{}');
set role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',false);
select public.create_tenant('Blue Bottle Coffee','blue-bottle');
insert into public.tenant_members(tenant_id,user_id,role) select id,'a0000000-0000-4000-8000-000000000002','staff' from public.tenants where slug='blue-bottle';
insert into public.locations(tenant_id,name,address) select id,'Hayes Valley · Kiosk 01','315 Linden St, San Francisco, CA' from public.tenants where slug='blue-bottle';
insert into public.locations(tenant_id,name,address) select id,'Ferry Building · Station 02','1 Ferry Bldg #7, San Francisco, CA' from public.tenants where slug='blue-bottle';
insert into public.programs(tenant_id,name,stamps_required,reward_title,stamp_cooldown_seconds,max_stamps_per_scan,max_stamps_per_day)
  select id,'Espresso Club',7,'Free Signature Drink or Pastry',0,2,20 from public.tenants where slug='blue-bottle';
select set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-000000000001',false);
select public.create_tenant('Bakery Beta','bakery-beta');
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',false);
select public.get_my_qr_credentials();
select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000002',false);
select public.get_my_qr_credentials();
reset role;
