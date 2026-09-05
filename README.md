# Inversiones

Dashboard personal de inversiones: portafolio con P&L, seguimiento de activos,
noticias filtradas por lo que tenés, señales técnicas y análisis con IA.

Cubre tres mercados en un solo lugar — **acciones de EE.UU.**, **acciones argentinas y
CEDEARs** (con conversión por CCL/MEP) y **cripto** — usando APIs públicas gratuitas
que no requieren registro.

## Arrancar

```bash
npm install
npm run dev            # http://localhost:3000
```

No hace falta configurar nada para empezar: la base SQLite se crea sola en
`data/inversiones.db` la primera vez que abrís la app.

Para habilitar el botón **Analizar con IA**:

```bash
cp .env.example .env.local
# cargá tu ANTHROPIC_API_KEY y reiniciá el servidor
```

Sin esa key el resto del dashboard funciona igual; solo ese botón queda deshabilitado
con un cartel que lo explica.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm test` | Tests unitarios de los cálculos (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Cómo se usa

1. **Portafolio** → buscá un ticker y registrá la compra. El costo promedio se
   **deriva de tus transacciones**; no se edita a mano. Eso permite separar P&L
   realizado de no realizado.
2. **Seguimiento** → activos que mirás sin tener. También alimentan las noticias.
3. **Alertas** → condiciones de precio o variación diaria.
4. Hacé clic en cualquier ticker para ver su detalle: gráfico 1D–5A, indicadores y noticias.

### Formato de los tickers

| Mercado | Ejemplo | Moneda del precio |
|---|---|---|
| Acciones EE.UU. | `AAPL`, `NVDA`, `SPY` | USD |
| Acciones ARG / CEDEARs | `GGAL.BA`, `YPFD.BA`, `AAPL.BA` | ARS |
| Cripto | `BTC-USD`, `ETH-USD`, `SOL-USD` | USD |

Los activos en pesos se convierten a dólares al **CCL**; el total del portafolio se
muestra también en pesos al **MEP**. La tasa usada siempre queda a la vista.

## En el celular

La app está pensada primero para el teléfono: barra de pestañas abajo (respetando el área
segura del dispositivo), y las tablas —posiciones, seguimiento, transacciones— se apilan como
filas en pantallas angostas en lugar de obligar a scrollear de costado. Desde `lg` la barra
pasa a ser un panel lateral y las tablas vuelven a su forma de columnas.

## Fuentes de datos

Todas públicas y sin API key:

| Fuente | Para qué |
|---|---|
| Yahoo Finance (`query1.finance.yahoo.com`) | Precios, histórico y búsqueda de tickers |
| Yahoo Finance RSS (`feeds.finance.yahoo.com`) | Noticias por activo |
| CoinGecko | Precios e histórico de cripto |
| dolarapi.com | Dólar oficial, blue, MEP, CCL, cripto |
| data912.com | Panel Merval y CEDEARs (respaldo para tickers `.BA`) |

Todas se consultan **desde el servidor**, nunca desde el navegador: evita CORS,
permite cachear y mantiene el acceso externo aislado en `src/lib/providers/`.

## Arquitectura

```
src/
  app/
    api/            route handlers (todo el acceso externo pasa por acá)
    …/page.tsx      pantallas
  components/       UI y gráficos
  lib/
    analytics/      pnl · indicators · risk   ← con tests
    db/             schema.sql + cliente SQLite
    market/         resolución de símbolo, caché con TTL, HTTP
    providers/      yahoo · yahoo-rss · coingecko · dolarapi · data912
    services/       portfolio · signals · alerts
```

Los cálculos que importan viven en `src/lib/analytics/` y están cubiertos por tests:
costo promedio ponderado, P&L realizado y no realizado, conversión ARS→USD, RSI de
Wilder (validado contra el valor publicado de la serie de referencia), SMA,
volatilidad y concentración (HHI).

## Limitaciones conocidas

- **Las alertas solo se evalúan con la app abierta.** No hay proceso en segundo
  plano: se chequean cada vez que se refrescan los precios. Si cerrás la app, no
  se disparan hasta que la vuelvas a abrir.
- **Los endpoints de Yahoo y data912 no son oficiales** y pueden cambiar o cortar
  sin aviso. Si un proveedor falla, la app sirve el último dato cacheado marcándolo
  como tal, y los activos que no pudo valuar aparecen listados como "sin precio" —
  la página no se rompe.
- **La evolución del portafolio se construye hacia adelante**, con un snapshot por
  día a partir de que empezás a usar la app. No reconstruye historia previa.
- Las señales técnicas se calculan sobre las **8 posiciones más grandes**, para no
  pedir un año de histórico de cada activo en cada carga.

## Aviso

Este proyecto es de uso personal, informativo y educativo. **No constituye
asesoramiento financiero** ni una recomendación de compra o venta. Los datos vienen
de fuentes públicas no oficiales y pueden tener demoras o errores. Verificá siempre
antes de operar.
