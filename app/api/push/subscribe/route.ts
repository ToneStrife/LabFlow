import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // 1. Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  try {
    const newSubscription = await request.json();
    
    if (!newSubscription || !newSubscription.endpoint || !newSubscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const { endpoint, keys } = newSubscription;
    const { p256dh, auth } = keys;

    // 2. Insert the new subscription into Supabase
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: endpoint,
        p256dh: p256dh,
        auth: auth,
      }, { onConflict: 'endpoint' }) // Use upsert to avoid duplicates if the user subscribes again
      .select();

    if (error) {
      console.error('Supabase error saving subscription:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Subscription saved.', data });
  } catch (error) {
    console.error('Error processing subscription:', error);
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
  }
}