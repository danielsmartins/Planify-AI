import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

export interface ExtractedData {
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
}

export async function extractFinancialData(text: string, existingCategories: string[] = []): Promise<ExtractedData | null> {
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
}

Categorias existentes do usuário: ${existingCategories.length > 0 ? existingCategories.join(', ') : 'Nenhuma categoria cadastrada'}.

Regras:
1. Tente classificar a despesa/ganho em uma das categorias existentes. SE NÃO SE ENCAIXAR em nenhuma, crie UMA NOVA CATEGORIA que seja concisa e faça sentido (ex: Saúde, Educação, Casa).
2. Se a mensagem não parecer uma transação financeira, retorne null.
3. Apenas retorne o JSON puro e válido. Não coloque crases (\`\`\`).
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
