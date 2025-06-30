-- SQL script to update foreign key constraints to use CASCADE delete
-- This will automatically delete child records when parent load is deleted

-- 1. Drop existing foreign key constraints
ALTER TABLE pickups DROP CONSTRAINT IF EXISTS pickups_load_id_fkey;
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_load_id_fkey;
ALTER TABLE load_documents DROP CONSTRAINT IF EXISTS load_documents_load_id_fkey;

-- 2. Add new foreign key constraints with CASCADE delete
ALTER TABLE pickups 
ADD CONSTRAINT pickups_load_id_fkey 
FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE;

ALTER TABLE deliveries 
ADD CONSTRAINT deliveries_load_id_fkey 
FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE;

ALTER TABLE load_documents 
ADD CONSTRAINT load_documents_load_id_fkey 
FOREIGN KEY (load_id) REFERENCES loads(id) ON DELETE CASCADE;

-- Verify the constraints were created correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('pickups', 'deliveries', 'load_documents')
ORDER BY tc.table_name; 