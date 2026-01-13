import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number;
    updated_at: number;
  };
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers');
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkWebhookEvent;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const { type, data } = evt;
  const userId = data.id;

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const primaryEmail = data.email_addresses.find(
          (e) => e.id === data.email_addresses[0]?.id
        );

        if (!primaryEmail) {
          console.error('No email found for user:', userId);
          return NextResponse.json(
            { error: 'No email found' },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: primaryEmail.email_address,
            first_name: data.first_name,
            last_name: data.last_name,
            image_url: data.image_url,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Error syncing user to Supabase:', error);
          return NextResponse.json(
            { error: 'Database sync failed' },
            { status: 500 }
          );
        }

        console.log(`User ${type.replace('user.', '')}:`, userId);
        break;
      }

      case 'user.deleted': {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('Error deleting user from Supabase:', error);
          return NextResponse.json(
            { error: 'Database deletion failed' },
            { status: 500 }
          );
        }

        console.log('User deleted:', userId);
        break;
      }

      default:
        console.log('Unhandled webhook event type:', type);
    }

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}