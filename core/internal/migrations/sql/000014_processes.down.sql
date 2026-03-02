DROP TRIGGER IF EXISTS trigger_processes_protect_code ON content.processes;
DROP FUNCTION IF EXISTS content.protect_process_code();
DROP TRIGGER IF EXISTS trigger_processes_updated_at ON content.processes;
DROP TABLE IF EXISTS content.processes;
