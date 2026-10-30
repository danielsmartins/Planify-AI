import { NextRequest } from "next/server";
import { POST } from "../app/api/telegram/route";

// Backup do fetch original
const originalFetch = global.fetch;

// Mock do global fetch para interceptar os downloads de arquivos do Telegram
global.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input.toString();

  // Intercepta a chamada de getFile
  if (url.includes("getFile") && url.includes("mock_file_id_123")) {
    console.log("[MOCK FETCH] Interceptado getFile. Retornando caminho do arquivo simulado.");
    return new Response(
      JSON.stringify({
        ok: true,
        result: {
          file_path: "mock_invoice.pdf"
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Intercepta o download do arquivo PDF simulado
  if (url.includes("mock_invoice.pdf")) {
    console.log("[MOCK FETCH] Interceptado download do PDF. Retornando buffer de teste...");
    const dummyPdfBuffer = Buffer.from("%PDF-1.4 Mock PDF content for test");
    return new Response(dummyPdfBuffer, {
      status: 200,
      headers: { "Content-Type": "application/pdf" }
    });
  }

  // Qualquer outra requisição (ex: enviar mensagem ao Telegram) passa direto
  return originalFetch(input, init);
}) as typeof global.fetch;

async function runTest() {
  // Simulando a requisição do Telegram com um arquivo PDF
  const body = {
    update_id: 974784547,
    message: {
      message_id: 66,
      from: {
        id: 999999999,
        is_bot: false,
        first_name: "TestUser",
        language_code: "pt-br"
      },
      chat: {
        id: 999999999,
        first_name: "TestUser",
        type: "private"
      },
      date: 1783796797,
      document: {
        file_name: "fatura_nubank.pdf",
        mime_type: "application/pdf",
        file_id: "mock_file_id_123",
        file_unique_id: "mock_unique_id_123",
        file_size: 12345
      }
    }
  };

  const req = new NextRequest("https://localhost:3000/api/telegram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  console.log("--- INICIANDO TESTE LOCAL COM FATURA PDF ---");
  const response = await POST(req);
  console.log("Status de resposta:", response.status);
  const data = await response.json();
  console.log("Dados retornados:", JSON.stringify(data, null, 2));
}

runTest().catch(error => {
  console.error("Erro ao executar teste local:", error);
});
