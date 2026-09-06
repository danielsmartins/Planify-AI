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

export interface ValidFinancialData {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  isInstallment?: boolean;
  installmentsCount?: number;
  currentInstallment?: number;
  date?: string;
  paymentMethodSuggestion?: string;
}

export type FinancialValidationResult =
  | { valid: true; data: ValidFinancialData }
  | {
      valid: false;
      reason: 'empty' | 'missing_amount';
      description?: string;
      paymentMethodSuggestion?: string;
    };

export function validateFinancialData(data: unknown): FinancialValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'empty' };
  }

  const d = data as Record<string, unknown>;
  const rawAmount = d.amount;
  const numAmount =
    rawAmount !== null && rawAmount !== undefined && rawAmount !== ''
      ? Number(rawAmount)
      : null;

  const description = typeof d.description === 'string' ? d.description.trim() : '';
  const paymentMethodSuggestion =
    typeof d.paymentMethodSuggestion === 'string' && d.paymentMethodSuggestion.trim()
      ? d.paymentMethodSuggestion.trim()
      : undefined;

  if (numAmount === null || isNaN(numAmount) || numAmount <= 0) {
    return {
      valid: false,
      reason: 'missing_amount',
      description: description || undefined,
      paymentMethodSuggestion,
    };
  }

  return {
    valid: true,
    data: {
      amount: numAmount,
      description: description || 'Sem descrição',
      category: typeof d.category === 'string' && d.category.trim() ? d.category.trim() : 'Outros',
      type: d.type === 'income' ? 'income' : 'expense',
      isInstallment: Boolean(d.isInstallment),
      installmentsCount: typeof d.installmentsCount === 'number' ? d.installmentsCount : undefined,
      currentInstallment: typeof d.currentInstallment === 'number' ? d.currentInstallment : undefined,
      date: typeof d.date === 'string' ? d.date : undefined,
      paymentMethodSuggestion,
    },
  };
}

export function buildMissingAmountPrompt(
  description?: string,
  paymentMethodSuggestion?: string,
  isVoice?: boolean
): string {
  const desc = description ? `*${description}*` : 'essa transação';
  const suggestion = paymentMethodSuggestion ? ` no ${paymentMethodSuggestion}` : '';
  const example = description
    ? `\`${description} 50 reais${suggestion}\``
    : '`Uber 25 reais`';

  if (isVoice) {
    return `🤔 Identifiquei ${desc}, mas não encontrei o *valor* no seu áudio.\n\nPoderia enviar novamente informando quanto foi?\n\nExemplo: ${example}`;
  }

  return `🤔 Identifiquei ${desc}, mas não encontrei o *valor* da transação.\n\nPoderia enviar novamente informando quanto custou?\n\nExemplo: ${example}`;
}
