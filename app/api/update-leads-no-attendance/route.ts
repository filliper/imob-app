import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  // Check for the secret token
  const secret = request.headers.get('x-cron-token');
  if (secret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Compute timestamp for 2 hours ago in UTC
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch leads that haven't been contacted in the last 2 hours and are still pending
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id,
        name,
        agent_id,
        user_id,
        last_contact,
        agents!inner(email),
        auth_users!user_id(email)
      `)
      .lt('last_contact', twoHoursAgo)
      .in('status', ['novo', 'atendendo']);

    if (error) {
      throw error;
    }

    if (!leads || leads.length === 0) {
      return new Response('No leads without attendance found', { status: 200 });
    }

    // Initialize Resend
    const resend = require('resend');
    const resendClient = resend(process.env.RESEND_API_KEY);

    // Send email notifications for each lead
    const emailPromises = leads.map(async (lead: any) => {
      // Determine responsible email: prefer agent email, else user email
      let recipientEmail: string | undefined;
      // 'agents' and 'auth_users' come back as arrays from Supabase when using joins
      if (Array.isArray(lead.agents) && lead.agents[0]?.email) {
        recipientEmail = lead.agents[0].email;
      } else if (Array.isArray(lead.auth_users) && lead.auth_users[0]?.email) {
        recipientEmail = lead.auth_users[0].email;
      }

      if (!recipientEmail) {
        console.warn(`No email found for lead ID: ${lead.id}`);
        return; // Skip sending email if no email found
      }

      try {
        await resendClient.emails.send({
          from: 'ImobApp <onboarding@resend.dev>',
          to: recipientEmail,
          subject: `Lead sem atendimento: ${lead.name}`,
          html: `
            <p>Olá,</p>
            <p>O lead <strong>${lead.name}</strong> não recebeu atendimento há mais de 2 horas.</p>
            <p>Último contato: ${new Date(lead.last_contact).toLocaleString('pt-BR')}</p>
            <p>Por favor, atendê-lo assim que possível.</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending email for lead:', emailError);
        // Continue sending other emails
      }
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    return new Response(`Processed ${leads.length} leads without attendance`, { status: 200 });
  } catch (error) {
    console.error('Error in update-leads-no-attendance:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}