import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SISTEMA DE PROMPT OTIMIZADO PARA PRODUTOS BRASILEIROS
const SISTEMA_PROMPT = `
Você é o motor de enriquecimento do UltraData, especialista em e-commerce brasileiro.

<REGRA DE OURO>
NUNCA INVENTE VALORES. Sua tarefa é PADRONIZAR, NÃO CRIAR.
Se um dado não puder ser inferido com 95% de confiança a partir do contexto, deixe vazio e sinalize para revisão.
</REGRA DE OURO>

<FORMATO DE RESPOSTA OBRIGATÓRIO>
Responda APENAS com este JSON:
{
  "nome_padronizado": "string (corrige grafia, acentos, maiúsculas)",
  "descricao_enriquecida": "string (melhora a descrição mantendo fatos)",
  "categoria_inferida": "string (formato: 'Categoria > Subcategoria' ou vazio)",
  "marca_inferida": "string (SÓ se for óbvia. Senão, vazio)",
  "origem_inferida": "Nacional" | "Importado" | "",
  "status_inferencia": {
    "necessita_revisao": boolean,
    "razao": "string (explicação clara do que é incerto)"
  }
}
</FORMATO DE RESPOSTA>

<EXEMPLOS>
1. Entrada: {"nome": "mouse gamer rgb"}
   Saída: {"nome_padronizado": "Mouse Gamer RGB", ..., "status_inferencia": {"necessita_revisao": true, "razao": "Categoria não inferível"}}

2. Entrada: {"nome": "Furadeira Black+Decker 500W", "categoria": ""}
   Saída: {"nome_padronizado": "Furadeira Black+Decker 500W", "categoria_inferida": "Ferramentas > Elétricas", ..., "necessita_revisao": false}
</EXEMPLOS>
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { produto, user_id, session_id } = await req.json();
    
    if (!produto) {
      return new Response(
        JSON.stringify({ error: true, mensagem: "Produto não fornecido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: true, mensagem: "DEEPSEEK_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. CHAMADA À API DEEPSEEK
    console.log("Chamando DeepSeek API para produto:", JSON.stringify(produto).substring(0, 100));
    
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SISTEMA_PROMPT },
          { role: "user", content: JSON.stringify(produto) }
        ],
        temperature: 0.1, // Baixa para consistência
        response_format: { type: "json_object" }
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error("Erro DeepSeek:", deepseekResponse.status, errorText);
      throw new Error(`Falha na API DeepSeek: ${deepseekResponse.status}`);
    }
    
    const deepseekData = await deepseekResponse.json();
    console.log("Resposta DeepSeek recebida");
    
    let resultado;
    try {
      resultado = JSON.parse(deepseekData.choices[0].message.content);
    } catch (parseError) {
      console.error("Erro ao parsear resposta:", deepseekData.choices[0].message.content);
      throw new Error("Resposta da IA não é JSON válido");
    }

    const tempoProcessamento = Date.now() - startTime;
    
    // 2. SALVAR NO BANCO (se user_id fornecido)
    if (user_id) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const { error: insertError } = await supabaseClient
        .from("produtos_processados")
        .insert({
          user_id,
          session_id: session_id || null,
          produto_original: produto,
          nome_padronizado: resultado.nome_padronizado || null,
          descricao_enriquecida: resultado.descricao_enriquecida || null,
          categoria_inferida: resultado.categoria_inferida || null,
          marca_inferida: resultado.marca_inferida || null,
          origem_inferida: resultado.origem_inferida || null,
          necessita_revisao: resultado.status_inferencia?.necessita_revisao ?? true,
          razao_revisao: resultado.status_inferencia?.razao || null,
          validado: false,
          modelo_ia: 'deepseek-chat',
          tempo_processamento_ms: tempoProcessamento,
        });
      
      if (insertError) {
        console.error("Erro ao salvar no banco:", insertError);
        // Continua mesmo com erro no banco - retorna o resultado
      }
    }
    
    return new Response(
      JSON.stringify({
        ...resultado,
        tempo_processamento_ms: tempoProcessamento,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        status_inferencia: { necessita_revisao: true, razao: "Erro no processamento" }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
