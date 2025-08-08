-- Create database and user if they don't exist
CREATE DATABASE ideaforge;
CREATE USER ideaforge WITH ENCRYPTED PASSWORD 'ideaforge_dev_password';
GRANT ALL PRIVILEGES ON DATABASE ideaforge TO ideaforge;

-- Connect to the ideaforge database
\c ideaforge;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO ideaforge;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ideaforge;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ideaforge;