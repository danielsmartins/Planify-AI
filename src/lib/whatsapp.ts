export async function sendWhatsAppMessage(toPhone: string, text: string) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn("Variáveis do WhatsApp não configuradas. Mensagem simulada que seria enviada para", toPhone, ":", text);
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      })
    });
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
}
