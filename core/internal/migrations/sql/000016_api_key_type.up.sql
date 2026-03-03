ALTER TABLE automation.api_keys
ADD COLUMN key_type VARCHAR(20) NOT NULL DEFAULT 'automation';
