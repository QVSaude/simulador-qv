'use server';

export async function getVexurEntities(filters: any) {
  console.log(`[BACKEND] Iniciando busca de entidades com filtros:`, JSON.stringify(filters, null, 2));
  
  const entitiesUrl = "https://gateway-qv.vexur.com.br/api-vexur-marketplace-catalogo-produto/obterConveniadosPorProfissao?api-key=cec1ffe7-576e-49ac-bef6-5879de811b55";

  let token;
  try {
    const authUrl =
      'https://gateway-qv.vexur.com.br/api-vexur-seguranca/autenticar?apikey=fd3cd379-ba5b-468c-b53e-fb9c16cda060';
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: 'integracao-ura@vexur.com',
        pw: 'aw0d4f37tv',
      }),
    });
    if (!authResponse.ok) {
      throw new Error(`Erro autenticação Vexur: ${await authResponse.text()}`);
    }
    const authData = await authResponse.json();
    token = authData.token;
    console.log('🔐 [BACKEND] Token Vexur obtido com sucesso para buscar entidades');
  } catch (err) {
    console.error('❌ Erro ao autenticar para buscar entidades:', err);
    throw new Error('Falha ao autenticar na Vexur');
  }


  try {
    const response = await fetch(entitiesUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            login: 'jaqueline.agra@qvsaude.com.br',
            "await-response": "true",
        },
        body: JSON.stringify({
            filtros: filters,
        }),
    });

    if (!response.ok) {
      console.error(`[BACKEND] Erro HTTP ao buscar entidades: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[BACKEND] Corpo do erro: ${errorBody}`);
      throw new Error("Erro HTTP ao buscar entidades");
    }

    const text = await response.text();

    if (!text) {
      console.warn("⚠️ [BACKEND] API de entidades retornou 200 porém sem conteúdo");
      return [];
    }

    const entities = JSON.parse(text);
    console.log(`[BACKEND] Entidades recebidas da API:`, entities);
    return entities;

  } catch (e) {
    console.error(" [BACKEND] Erro ao fazer fetch ou parse das entidades:", e);
    return [];
  }
}
