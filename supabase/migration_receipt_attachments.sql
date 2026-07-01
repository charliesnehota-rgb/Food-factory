-- Bucket pro přílohy příjemek (fotky účtenek / dodacích listů)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-attachments',
  'receipt-attachments',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "staff_only_receipt_attachments"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'receipt-attachments' AND false)
  WITH CHECK (false);

ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS attachment_path text;

COMMENT ON COLUMN goods_receipts.attachment_path IS
  'Cesta k souboru v bucketu receipt-attachments (foto účtenky / dodacího listu)';
