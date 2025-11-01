-- Migration to create the push_subscriptions table

CREATE TABLE public.push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to the authenticated user
    endpoint text NOT NULL UNIQUE, -- The unique URL for the push service
    p256dh text NOT NULL, -- Public key for encryption
    auth text NOT NULL, -- Auth secret for encryption
    created_at timestamp with time zone DEFAULT now()
);

-- Optional: Add RLS policies for security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own subscriptions
CREATE POLICY "Allow authenticated users to insert their own subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only select their own subscriptions
CREATE POLICY "Allow authenticated users to select their own subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only delete their own subscriptions
CREATE POLICY "Allow authenticated users to delete their own subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);