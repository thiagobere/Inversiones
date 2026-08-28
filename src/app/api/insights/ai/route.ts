import Anthropic from '@anthropic-ai/sdk';
import { fail, handle } from '@/lib/api';
import { getNewsFor } from '@/lib/market';
import { buildPortfolio } from '@/lib/services/portfolio';
import { buildSignals } from '@/lib/services/signals';

export const dynamic = 'force-dynamic';

const SYSTEM = `Sos un analista financiero que le explica a una sola persona el estado de su
propia cartera. Escribís en español rioplatense, claro y sin jerga innecesaria.

Reglas que no se negocian:
- Trabajás EXCLUSIVAMENTE con los datos que te pasan. Si un dato no está, decí que no está.
- Nunca inventes precios, porcentajes, noticias ni cifras.
- No des órdenes de compra o venta ("comprá X", "vendé Y"). Describí qué está pasando y qué
  factores mirar. Esto es información, no asesoramiento financiero.
- Sé concreto: citá los números que te dieron.

Devolvé markdown con exactamente estas secciones:
## Panorama  (2-3 oraciones sobre cómo viene la cartera)
## Qué se destaca  (3-5 viñetas sobre posiciones o señales puntuales)
## A qué prestar atención  (2-4 viñetas sobre riesgos o cosas a seguir)`;

const money = (n: number | null) => (n === null ? 's/d' : `US$${n.toFixed(2)}`);
const pct = (n: number | null) => (n === null ? 's/d' : `${n.toFixed(2)}%`);

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(
      'Falta ANTHROPIC_API_KEY. Copiá .env.example a .env.local, cargá tu key y reiniciá el servidor.',
      503,
    );
  }

  return handle(async () => {
    const view = await buildPortfolio();
    if (view.positions.length === 0) {
      throw new Error('No hay posiciones cargadas para analizar.');
    }

    const signals = await buildSignals(view);
    const news = await getNewsFor(view.positions.map((p) => p.symbol));

    const context = [
      `TOTALES: valor ${money(view.totals.marketValueUsd)}, costo ${money(view.totals.costBasisUsd)}, ` +
        `no realizado ${money(view.totals.unrealizedPnlUsd)} (${pct(view.totals.unrealizedPnlPct)}), ` +
        `variación del día ${money(view.totals.dayPnlUsd)}.`,
      `DÓLAR: MEP ${view.fx.mep ?? 's/d'}, CCL ${view.fx.ccl ?? 's/d'} (ARS por USD).`,
      '',
      'POSICIONES:',
      ...view.positions.map(
        (p) =>
          `- ${p.symbol} (${p.assetClass}): ${p.quantity} u. a costo ${p.avgCost.toFixed(2)} ${p.currency}; ` +
          `precio ${p.price?.toFixed(2) ?? 's/d'}; peso ${p.weight.toFixed(1)}%; ` +
          `no realizado ${money(p.unrealizedPnlUsd)} (${pct(p.unrealizedPnlPct)}); día ${pct(p.dayChangePct)}`,
      ),
      '',
      'SEÑALES YA CALCULADAS:',
      ...(signals.length
        ? signals.map((s) => `- [${s.severity}] ${s.title}: ${s.detail}`)
        : ['- (ninguna)']),
      '',
      'TITULARES RECIENTES:',
      ...(news.length
        ? news.slice(0, 15).map((n) => `- (${n.symbols.join(', ')}) ${n.title} — ${n.publisher}`)
        : ['- (ninguno)']),
    ].join('\n');

    const client = new Anthropic();

    try {
      const response = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 16000,
        system: SYSTEM,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content: `Analizá esta cartera:\n\n${context}` }],
      });

      if (response.stop_reason === 'refusal') {
        throw new Error('El modelo declinó responder a este pedido.');
      }

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      return { analysis: text, generatedAt: Date.now(), model: response.model };
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) {
        throw new Error('La ANTHROPIC_API_KEY es inválida o expiró.');
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new Error('Límite de uso de la API alcanzado. Probá de nuevo en unos minutos.');
      }
      throw err;
    }
  });
}
