import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import webpush from 'web-push';

// Configure web-push with VAPID keys from environment variables
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your actual email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  // NOTE: This endpoint is intentionally left without authentication for easy testing, 
  // but in a real app, you should restrict who can send notifications.

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // 1. Fetch all subscriptions from the database
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscribers found.' });
    }

    // 2. Define the payload (the data sent to the Service Worker)
    const payload = JSON.stringify({
      title: '¡Notificación de Prueba!',
      body: 'Esta es una notificación enviada desde tu servidor Next.js.',
      url: '/', // Optional URL to open when clicked
    });

    const sendPromises = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      
      // Send the notification
      return webpush.sendNotification(pushSubscription, payload)
        .catch(async (err) => {
          console.error('Push failed for subscription:', sub.endpoint, err);
          
          // If the subscription is no longer valid (e.g., user revoked permission), delete it
          if (err.statusCode === 410) {
            console.log('Subscription expired, deleting from DB...');
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, message: `Sent notification to ${subscriptions.length} subscribers.` });
  } catch (error) {
    console.error('General error sending notifications:', error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}