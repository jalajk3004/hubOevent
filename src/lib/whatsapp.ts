// Initialize Meta WhatsApp Cloud API config
const accessToken = process.env.META_WA_ACCESS_TOKEN;
const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;

// API endpoint URL for sending messages (using v18.0)
const getApiUrl = () => `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

interface TicketDetails {
  name: string;
  event: string;
  category: string;
  type: string;
  quantity: number;
  ticketId: string;
  paymentId: string;
  amount: number | string;
}

export async function sendWhatsAppTicket(phone: string, ticketDetails: TicketDetails) {
  if (!accessToken || !phoneNumberId) {
    console.warn('[WHATSAPP] Meta WhatsApp Cloud API credentials are not configured in environment variables. Message skipped.');
    return { success: false, error: 'Meta WhatsApp credentials not configured' };
  }

  try {
    // Format the phone number (remove + and spaces)
    const formattedPhone = phone.replace('+', '').replace(/\s/g, '');

    console.log(`[WHATSAPP] Attempting to send message to ${formattedPhone} using ID ${phoneNumberId}`);

    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'hello_world',
          language: {
            code: 'en_US'
          }
        }
      }),
    });

    const data = await response.json();
    console.log('[WHATSAPP] API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`[WHATSAPP] Meta API Error:`, data);
      throw new Error(data.error?.message || 'Failed to send WhatsApp message via Meta API');
    }

    console.log(`[WHATSAPP] Successfully accepted for delivery to ${formattedPhone}. Message ID: ${data.messages?.[0]?.id}`);
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error(`[WHATSAPP] Failed to send message to ${phone}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
