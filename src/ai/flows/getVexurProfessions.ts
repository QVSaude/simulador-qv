'use server';

export async function getVexurProfessions(): Promise<string[]> {
  // 1. Authenticate to get a token
  let token: string;
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
      const errorText = await authResponse.text();
      console.error(`[BACKEND] Erro autenticação Vexur para profissões: ${errorText}`);
      throw new Error('Falha ao autenticar na Vexur para buscar profissões');
    }

    const authData = await authResponse.json();
    token = authData.token;
    console.log('🔐 [BACKEND] Token Vexur obtido com sucesso para buscar profissões');
  } catch (err) {
    console.error('❌ Erro ao autenticar para buscar profissões:', err);
    throw new Error('Falha ao autenticar na Vexur');
  }

  // 2. Fetch professions with the token
  const response = await fetch(
    "https://gateway-qv.vexur.com.br/api-vexur-marketplace-catalogo-produto/obterProfissoes?api-key=cec1ffe7-576e-49ac-bef6-5879de811b55",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Use the fetched token
        login: 'jaqueline.agra@qvsaude.com.br', // Use the correct login
      },
      body: JSON.stringify({}), // Body must be an empty JSON object
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[BACKEND] Erro ao buscar profissões - STATUS:", response.status);
    console.error("[BACKEND] Erro ao buscar profissões - BODY:", errorText);
    throw new Error("Erro ao buscar profissões da Vexur");
  }

  const professions = await response.json();
  console.log(`[BACKEND] ${professions.length} profissões retornadas com sucesso.`);
  return professions;
}
