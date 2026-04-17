interface TicketDetails {
  name: string;
  event: string;
  ticketId: string;
  venue?: string;
}

export async function sendWhatsAppTicket(phone: string, details: TicketDetails) {
  const accessToken = Deno.env.get('META_WA_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('META_WA_PHONE_NUMBER_ID');

  if (!accessToken || !phoneNumberId) {
    console.warn('[WHATSAPP] Missing META_WA_ACCESS_TOKEN or META_WA_PHONE_NUMBER_ID');
    return { success: false };
  }

  let formattedPhone = phone.replace(/\D/g, '');
  if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }

  const { name, ticketId, venue = 'TBD' } = details;

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: 'ticket_confirmation',
      language: { code: 'en' },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', parameter_name: 'name', text: name },
          { type: 'text', parameter_name: 'ticket_id', text: ticketId },
          { type: 'text', parameter_name: 'venue', text: venue },
        ],
      }],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'WhatsApp API error');
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error('[WHATSAPP ERROR]', err);
    return { success: false };
  }
}
