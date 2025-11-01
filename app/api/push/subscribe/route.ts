import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const subscriptionsFilePath = path.join(process.cwd(), 'subscriptions.json');

async function getSubscriptions() {
  try {
    const data = await fs.readFile(subscriptionsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const newSubscription = await request.json();
    if (!newSubscription || !newSubscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const subscriptions = await getSubscriptions();
    
    // Check if the subscription already exists
    const existingSubscription = subscriptions.find(
      (sub: any) => sub.endpoint === newSubscription.endpoint
    );

    if (!existingSubscription) {
      subscriptions.push(newSubscription);
      await fs.writeFile(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2));
    }

    return NextResponse.json({ success: true, message: 'Subscription saved.' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}