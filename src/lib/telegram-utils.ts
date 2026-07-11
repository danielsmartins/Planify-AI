export function getPaymentMethodSuggestion(
  textMessage: string,
  userCards: { id: string; name: string }[],
  userAccounts: { id: string; name: string }[],
  aiSuggestion?: string,
  isInstallment?: boolean
): { cardId: string | null; accountId: string | null } {
  let suggestedCardId: string | null = null;
  let suggestedAccountId: string | null = null;

  if (aiSuggestion) {
    const suggestionLower = aiSuggestion.toLowerCase();
    for (const card of userCards) {
      if (suggestionLower.includes(card.name.toLowerCase()) || card.name.toLowerCase().includes(suggestionLower)) {
        suggestedCardId = card.id;
        break;
      }
    }
    if (!suggestedCardId) {
      for (const acc of userAccounts) {
        if (suggestionLower.includes(acc.name.toLowerCase()) || acc.name.toLowerCase().includes(suggestionLower)) {
          suggestedAccountId = acc.id;
          break;
        }
      }
    }
  }

  if (!suggestedCardId && !suggestedAccountId) {
    const targetText = textMessage.toLowerCase();
    for (const card of userCards) {
      if (targetText.includes(card.name.toLowerCase())) {
        suggestedCardId = card.id;
        break;
      }
    }
    if (!suggestedCardId) {
      for (const acc of userAccounts) {
        if (targetText.includes(acc.name.toLowerCase())) {
          suggestedAccountId = acc.id;
          break;
        }
      }
    }
  }

  if (!suggestedCardId && !suggestedAccountId) {
    const isCredit = textMessage.toLowerCase().includes('crédito') || textMessage.toLowerCase().includes('cartão') || !!isInstallment;
    if (isCredit && userCards.length > 0) {
      suggestedCardId = userCards[0].id;
    } else if (userAccounts.length > 0) {
      suggestedAccountId = userAccounts[0].id;
    } else if (userCards.length > 0) {
      suggestedCardId = userCards[0].id;
    }
  }

  return { cardId: suggestedCardId, accountId: suggestedAccountId };
}
