import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export interface ExtractedData {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  isInstallment?: boolean;
  installmentsCount?: number;
  currentInstallment?: number;
}

export async function extractFinancialData(text: string, existingCategories: string[] = []): Promise<ExtractedData | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Você é um assistente financeiro inteligente.
O usuário enviou a seguinte mensagem no WhatsApp/Telegram: "${text}"

Sua tarefa é extrair os seguintes dados financeiros dessa mensagem e retorná-los EXATAMENTE como um JSON, sem formatação markdown ou texto adicional.

Formato esperado:
{
  "amount": número (valor em float da parcela, ex: 25.50. Se o usuário falar "Comprei algo de 1000 reais em 10 vezes", o valor da parcela é 100),
  "description": string (descrição curta do que foi gasto/ganho),
  "category": string (uma palavra que classifique. ex: Alimentação, Transporte, Saúde, Salário, Compras, etc),
  "type": string ("income" se for entrada de dinheiro/ganho, ou "expense" se for um gasto/despesa),
  "isInstallment": boolean (true se a pessoa mencionar que foi parcelado, crédito, em x vezes, etc. Falso caso contrário),
  "installmentsCount": number (se isInstallment for true, qual o total de parcelas? Ex: se comprou em 10x, retorne 10. Se não for parcelado, omita ou retorne null),
  "currentInstallment": number (se isInstallment for true, em qual parcela a pessoa está? Se ela não falar, assuma 1. Se ela falar "já paguei 2", então ela está indo pagar a 3, retorne 3. Se não for parcelado, omita ou retorne null)
}

Categorias existentes do usuário: ${existingCategories.length > 0 ? existingCategories.join(', ') : 'Nenhuma categoria cadastrada'}.

Regras:
1. Tente classificar a despesa/ganho em uma das categorias existentes. SE NÃO SE ENCAIXAR em nenhuma, crie UMA NOVA CATEGORIA que seja concisa e faça sentido (ex: Saúde, Educação, Casa).
2. Se a mensagem não parecer uma transação financeira, retorne null.
3. Se for parcelado, MAS o usuário der APENAS o valor TOTAL, divida o valor total pelas parcelas para preencher o "amount". Ex: "TV de 2000 em 10x" -> amount = 200, isInstallment = true, installmentsCount = 10. Se ele falar "uma tv em 10 parcelas de 200", o amount já é 200.
4. Apenas retorne o JSON puro e válido. Não coloque crases (\`\`\`).
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    
    if (responseText === 'null') return null;

    const parsed = JSON.parse(responseText);
    return parsed as ExtractedData;
  } catch (error: unknown) {
    console.error("Gemini Extraction Error:", error);
    if (typeof error === 'object' && error !== null) {
      const errStatus = 'status' in error ? (error as { status: unknown }).status : null;
      const errMsg = 'message' in error ? (error as { message: unknown }).message : null;
      
      const statusIs429 = errStatus === 429;
      const msgContains429 = typeof errMsg === 'string' && (errMsg.includes('429') || errMsg.toLowerCase().includes('quota'));

      if (statusIs429 || msgContains429) {
        throw new Error('RATE_LIMIT');
      }
    }
    return null;
  }
}

export async function extractInvoiceTransactions(text: string, existingCategories: string[] = []): Promise<ExtractedData[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Você é um assistente financeiro de extração de faturas de cartão de crédito.
Abaixo está o texto extraído de uma fatura de cartão de crédito em PDF:

"""
${text.substring(0, 30000)} // Limite para não estourar tokens
"""

Sua tarefa é extrair TODAS as compras/despesas listadas nessa fatura e retornar um array JSON contendo cada transação.

Formato esperado:
[
  {
    "amount": número (valor da compra),
    "description": string (descrição do estabelecimento/compra),
    "category": string (classifique a compra),
    "type": "expense"
  }
]

Categorias existentes do usuário: ${existingCategories.length > 0 ? existingCategories.join(', ') : 'Nenhuma categoria cadastrada'}.
Regras:
1. Tente usar as categorias existentes, se não achar nenhuma parecida, crie uma nova concisa (ex: Restaurante, Supermercado, Transporte).
2. Não inclua pagamentos da fatura em si, apenas as despesas/compras feitas no cartão.
3. Se for uma compra parcelada que já está na fatura (ex: "Compra X 02/10"), o valor que aparece já é o da parcela, então lance como uma despesa simples desse mês.
4. Retorne APENAS o JSON puro, sem marcações markdown ou \`\`\`.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    
    if (responseText === 'null' || responseText === '') return [];

    const parsed = JSON.parse(responseText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gemini Invoice Extraction Error:", error);
    return [];
  }
}

