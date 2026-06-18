-- ============================================================
-- Sanicom CRM — Limpiar datos de ejemplo
-- Pegar en Supabase Dashboard → SQL Editor → Run
-- Conserva: especialidades, categorias_equipo, pipeline_etapas
-- ============================================================

truncate table clientes          restart identity cascade;
truncate table equipos           restart identity cascade;
truncate table oportunidades     restart identity cascade;
truncate table demostraciones    restart identity cascade;
truncate table ordenes_servicio  restart identity cascade;
truncate table eventos_agenda    restart identity cascade;
truncate table notificaciones    restart identity cascade;
truncate table actividad         restart identity cascade;
