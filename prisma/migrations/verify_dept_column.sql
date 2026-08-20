-- Verify departmentId column exists on class_sections
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'class_sections' 
ORDER BY ordinal_position;
