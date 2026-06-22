-- ============================================================
-- Sanicom CRM — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Tabla de clientes (contactos anidados como JSONB)
create table if not exists clientes (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Tabla de equipos médicos
create table if not exists equipos (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Tabla de oportunidades (pipeline)
create table if not exists oportunidades (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Tabla de demostraciones
create table if not exists demostraciones (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Tabla de órdenes de servicio técnico
create table if not exists ordenes_servicio (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Tabla de eventos de agenda
create table if not exists eventos_agenda (
  id text primary key,
  data jsonb not null default '{}'::jsonb
);

-- Tabla de notificaciones (user_id separado para filtrar eficientemente)
create table if not exists notificaciones (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);
create index if not exists idx_notificaciones_user_id on notificaciones(user_id);
create index if not exists idx_notificaciones_created_at on notificaciones(created_at desc);

-- Tabla de actividad reciente (fecha_hora separado para ordenar)
create table if not exists actividad (
  id text primary key,
  fecha_hora timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);
create index if not exists idx_actividad_fecha_hora on actividad(fecha_hora desc);

-- Tablas de configuración (arrays de strings simples)
create table if not exists especialidades (
  nombre text primary key
);

create table if not exists categorias_equipo (
  nombre text primary key
);

create table if not exists pipeline_etapas (
  nombre text primary key,
  orden integer not null default 0
);

-- Subespecialidades de Fisioterapia (opcional — la app usa localStorage como fallback)
create table if not exists subespecialidades_fisioterapia (
  nombre text primary key
);

-- ============================================================
-- Row Level Security — permisivo para clave anon
-- (la autenticación la gestiona la propia aplicación)
-- ============================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'clientes','equipos','oportunidades','demostraciones',
    'ordenes_servicio','eventos_agenda','notificaciones','actividad',
    'especialidades','categorias_equipo','pipeline_etapas','subespecialidades_fisioterapia'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "allow_all_anon" on %I', t);
    execute format(
      'create policy "allow_all_anon" on %I for all to anon using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Tabla de suscripciones push (Web Push API)
create table if not exists push_subscriptions (
  id text primary key,
  user_id text not null,
  subscription jsonb not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "allow_all_anon" on push_subscriptions;
create policy "allow_all_anon" on push_subscriptions
  for all to anon using (true) with check (true);
