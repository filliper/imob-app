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
        contracts!inner (
          property_id,
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

    // Send email notifications for each updated payment
    if (updatedPayments && updatedPayments.length > 0) {
      const resend = require('resend');

      const resendClient = resend(process.env.RESEND_API_KEY);

      const emailPromises = updatedPayments.map(async (payment) => {
        const propertyName = payment.contracts?.properties?.name || 'Imóvel não identificado';
        const amount = Number(payment.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dueDate = new Date(payment.due_date).toLocaleDateString('pt-BR');

        try {
          await resendClient.emails.send({
            from: process.env.FROM_EMAIL!,
            to: ['destinatario@exemplo.com'], // TODO: Should be the user's email associated with the payment
            subject: `Pagamento em atraso - ${propertyName}`,
            html: `
              <h2>Pagamento em atraso</h2>
              <p>Prezado(a),</p>
              <p>O pagamento referente ao imóvel <strong>${propertyName}</strong> está em atraso.</p>
              <ul>
                <li>Valor: ${amount}</li>
                <li>Data de vencimento: ${dueDate}</li>
              </ul>
              <p>Por favor, regularize a situação o quanto antes.</p>
              <p>Atenciosamente,<br/>ImobApp</p>
            `,
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // We don't throw here to avoid stopping other emails
        }
      });

      await Promise.allSettled(emailPromises);
    }

    return new Response(`Successfully updated ${updatedPayments?.length ?? 0} overdue payments and sent notifications`, { status: 200 });
  } catch (error: any) {
    console.error('Error updating overdue payments:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}