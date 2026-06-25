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

  // Get current date in Brasília time (UTC-3) as string in 'YYYY-MM-DD'
  const todayString = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  try {
    // Update payments that are past due and still marked as 'pendente'
    // Also fetch related data for notifications
    const { data: updatedPayments, error } = await supabase
      .from('payments')
      .update({ status: 'atrasado' })
      .select(`
        id,
        amount,
        due_date,
        user_id,
        contracts!inner (
          properties!inner (
            name
          )
        )
      `)
      .eq('status', 'pendente')
      .lt('due_date', todayString);

    if (error) {
      throw error;
    }

    // If no payments were updated, return early
    if (!updatedPayments || updatedPayments.length === 0) {
      return new Response('No overdue payments found', { status: 200 });
    }

    // Get unique user IDs from the updated payments
    const userIds = [...new Set(updatedPayments.map(p => p.user_id))];

    // Fetch user emails for these user IDs
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .in('id', userIds);

    if (userError) {
      throw userError;
    }

    // Create a map of user ID to email
    const userEmailMap: Record<string, string> = {};
    users.forEach(user => {
      if (user.email) {
        userEmailMap[user.id] = user.email;
      }
    });

    // Initialize Resend
    const resend = require('resend');
    const resendClient = resend(process.env.RESEND_API_KEY);

    // Send email notifications for each updated payment
    const emailPromises = updatedPayments.map(async (payment) => {
      const propertyName = payment.contracts?.properties?.name || '';
      const userEmail = userEmailMap[payment.user_id];

      if (!userEmail) {
        console.warn(`No email found for user ID: ${payment.user_id}`);
        return; // Skip sending email if no email found
      }

      try {
        await resendClient.emails.send({
          from: 'ImobApp <onboarding@resend.dev>',
          to: userEmail,
          subject: `Pagamento em atraso: ${propertyName}`,
          html: `
            <p>Olá,</p>
            <p>O pagamento no valor de R$ ${payment.amount.toFixed(2)} referente ao imóvel <strong>${propertyName}</strong> está em atraso.</p>
            <p>Data de vencimento: ${new Date(payment.due_date).toLocaleDateString('pt-BR')}</p>
            <p>Por favor, regularize a situação o quanto antes.</p>
          `
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // We don't throw here because we want to continue sending other emails
      }
    });

    // Wait for all emails to be sent
    await Promise.all(emailPromises);

    return new Response(`Processed ${updatedPayments.length} overdue payments`, { status: 200 });
  } catch (error) {
    console.error('Error in update-overdue-payments:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}