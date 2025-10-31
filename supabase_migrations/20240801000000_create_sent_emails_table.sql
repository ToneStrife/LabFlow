CREATE TABLE public.sent_emails (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    to_email text NOT NULL,
    subject text NOT NULL,
    body_preview text, -- A short preview of the email body
    attachments_count integer DEFAULT 0 NOT NULL,
    status text NOT NULL, -- 'success' or 'failed'
    error_message text,
    sent_by uuid REFERENCES auth.users(id) -- User who initiated the email send
);

ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read sent_emails"
ON public.sent_emails FOR SELECT
TO authenticated
USING (true);

-- Optional: Allow admins to delete sent_emails
CREATE POLICY "Allow admins to delete sent_emails"
ON public.sent_emails FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));