'use server';
/**
 * @fileOverview Flow para autenticar e obter produtos da API da Vexur.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/* -------------------------------------------------------------------------- */
/*                                SCHEMAS                                     */
/* -------------------------------------------------------------------------- */

const ProponenteSchema = z.object({
  uuid: z.string(),
  parentesco: z.string(), // TITULAR | DEPENDENTE
  dataNascimento: z.number(), // timestamp
  cpf: z.string().optional(),
  sexo: z.string(),
  estadoCivil: z.string(),
  profissao: z.string(),
});

const LocalidadeSchema = z.object({
  uf: z.string(),
  municipio: z.string(),
});

const CorretorSchema = z.object({
    id: z.number(),
    nome: z.string(),
    email: z.string(),
    cpf: z.string(),
    praca: z.string(),
    estrutura: z.string(),
    tipoCorretor: z.string(),
});

const FiltrosSchema = z.object({
  origemProposta: z.string(),
  tipoProduto: z.literal('COLETIVO'),
  tipoContratacaoProduto: z.literal('Adesão'),
  conveniados: z.array(z.number()),
  EhCorretor: z.boolean(),
  EhEmpresarial: z.boolean(),
  localidade: LocalidadeSchema,
  corretor: CorretorSchema,
  proponentes: z.array(ProponenteSchema),
});


const GetVexurProductsInputSchema = z.object({
  filtros: FiltrosSchema,
});


export type GetVexurProductsInput = z.infer<typeof GetVexurProductsInputSchema>;

// Retorno da Vexur é grande e variável
const GetVexurProductsOutputSchema = z.any();
export type GetVexurProductsOutput = z.infer<typeof GetVexurProductsOutputSchema>;

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

export async function getVexurProducts(
  input: GetVexurProductsInput
): Promise<GetVexurProductsOutput> {
  return getVexurProductsFlow(input);
}

/* -------------------------------------------------------------------------- */
/*                                   FLOW                                     */
/* -------------------------------------------------------------------------- */

const getVexurProductsFlow = ai.defineFlow(
  {
    name: 'getVexurProductsFlow',
    inputSchema: GetVexurProductsInputSchema,
    outputSchema: GetVexurProductsOutputSchema,
  },
  async (input) => {
    console.log(
      "📥 [BACKEND] Payload recebido para simulação:",
      JSON.stringify(input, null, 2)
    );

    /* -------------------------- 1. AUTENTICAÇÃO --------------------------- */

    const authUrl =
      'https://gateway-qv.vexur.com.br/api-vexur-seguranca/autenticar?apikey=fd3cd379-ba5b-468c-b53e-fb9c16cda060';

    let token: string;

    try {
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: 'integracao-ura@vexur.com',
          pw: 'aw0d4f37tv',
        }),
      });

      if (!authResponse.ok) {
        const error = await authResponse.text();
        throw new Error(`Erro autenticação Vexur: ${error}`);
      }

      const authData = await authResponse.json();
      token = authData.token;

      console.log('🔐 [BACKEND] Token Vexur obtido com sucesso');

    } catch (err) {
      console.error('❌ Erro ao autenticar:', err);
      throw new Error('Falha ao autenticar na Vexur');
    }

    /* ---------------------------- 2. PRODUTOS ----------------------------- */

    const productsUrl =
      'https://gateway-qv.vexur.com.br/api-vexur-marketplace-catalogo-produto/obterProdutos?api-key=cec1ffe7-576e-49ac-bef6-5879de811b55';

    try {
      const productsResponse = await fetch(productsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          login: 'jaqueline.agra@qvsaude.com.br',
          'await-response': 'true',
        },
        body: JSON.stringify(input),
      });

      if (!productsResponse.ok) {
        const error = await productsResponse.text();
        throw new Error(`Erro buscar produtos: ${error}`);
      }

      const text = await productsResponse.text();

      // ⚠️ Vexur pode retornar 200 com body vazio
      if (!text) {
        console.warn('⚠️ Vexur retornou 200 porém body vazio');
        return [];
      }

      const products = JSON.parse(text);

      console.log(
        `📦 [BACKEND] ${products.length} planos retornados com sucesso`
      );

      return products;

    } catch (err) {
      console.error('❌ Erro ao buscar produtos:', err);
      throw new Error('Falha ao buscar produtos da Vexur');
    }
  }
);
