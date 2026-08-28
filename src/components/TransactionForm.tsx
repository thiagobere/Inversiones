'use client';

import { useState } from 'react';
import { ErrorNote } from '@/components/ui';
import { mutate } from '@/lib/useApi';

const FIELD = 'w-full border border-hairline bg-bg px-3 py-2.5 text-sm text-text focus:border-accent-dim focus:outline-none';

export default function TransactionForm({
  symbol, name, onSaved, onCancel,
}: {
  symbol: string;
  name: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await mutate('/api/portfolio', 'POST', {
        symbol, name, type,
        quantity: Number(quantity),
        price: Number(price),
        fees: fees === '' ? 0 : Number(fees),
        executed_at: date,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-hairline bg-surface-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="tnum text-text">
          {symbol} {name && <span className="ml-2 text-xs text-text-faint">{name}</span>}
        </p>
        <button type="button" onClick={onCancel} className="label text-text-faint hover:text-text">
          Cancelar
        </button>
      </div>

      {error && <ErrorNote message={error} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="label mb-1.5 block">Tipo</span>
          <select value={type} onChange={(e) => setType(e.target.value as 'buy' | 'sell')} className={FIELD}>
            <option value="buy">Compra</option>
            <option value="sell">Venta</option>
          </select>
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Cantidad</span>
          <input required type="number" step="any" min="0" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} className={`${FIELD} tnum`} placeholder="10" />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Precio unitario</span>
          <input required type="number" step="any" min="0" value={price}
            onChange={(e) => setPrice(e.target.value)} className={`${FIELD} tnum`} placeholder="200" />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Comisión</span>
          <input type="number" step="any" min="0" value={fees}
            onChange={(e) => setFees(e.target.value)} className={`${FIELD} tnum`} placeholder="0" />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Fecha</span>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${FIELD} tnum`} />
        </label>
      </div>

      <p className="text-xs text-text-faint">
        El precio va en la moneda en que cotiza el activo: USD para acciones de EE.UU. y cripto,
        ARS para tickers <span className="tnum">.BA</span>.
      </p>

      <button type="submit" disabled={saving}
        className="label border border-accent-dim px-4 py-2.5 text-accent transition-colors hover:bg-accent hover:text-bg disabled:opacity-40">
        {saving ? 'Guardando…' : 'Guardar operación'}
      </button>
    </form>
  );
}
