import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export interface ExtractedData {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
}

export async function extractFinancialData(text: string): Promise<ExtractedData | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Você é um assistente financeiro inteligente.
O usuário enviou a seguinte mensagem no WhatsApp: "${text}"

Sua tarefa é extrair os seguintes dados financeiros dessa mensagem e retorná-los EXATAMENTE como um JSON, sem formatação markdown ou texto adicional.

Formato esperado:
{
  "amount": número (valor em float, ex: 25.50),
  "description": string (descrição curta do que foi gasto/ganho),
  "category": string (uma palavra que classifique. ex: Alimentação, Transporte, Saúde, Salário, Compras, etc),
  "type": string ("income" se for entrada de dinheiro/ganho, ou "expense" se for um gasto/despesa)
}

Regras:
1. Se a mensagem não parecer uma transação financeira, retorne null.
2. Apenas retorne o JSON puro e válido. Não coloque crases (\`\`\`).
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    
    if (responseText === 'null') return null;

    const parsed = JSON.parse(responseText);
    return parsed as ExtractedData;
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    if (error?.status === 429 || (error?.message && (error.message.includes('429') || error.message.toLowerCase().includes('quota')))) {
      throw new Error('RATE_LIMIT');
    }
    return null;
  }
}
