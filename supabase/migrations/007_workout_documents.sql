-- Private, scoped workout PDFs. Existing plans and attachments are not deleted.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('workout-documents', 'workout-documents', false, 3145728, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
