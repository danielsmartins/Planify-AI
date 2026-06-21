export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram API Error:", err);
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
      }),
    });
  } catch (error) {
    console.error("Failed to answer callback query:", error);
  }
}
