import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, X, BookOpen, ChevronDown, ChevronUp, Zap, Edit2, Check } from 'lucide-react';

const EMPTY_FORM = {
  finishedProduct: '',
  outputQty: 1,
  version: '1.0',
  yieldPercent: 100,
  instructions: '',
  notes: '',
  components: []
};

const EMPTY_COMPONENT = { productId: '', qty: 1, unit: '', scrapFactor: 0, notes: '' };

export default function BillOfMaterials() {
  const [boms, setBoms]         = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBom, setEditBom]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState(null);
  const [explosion, setExplosion] = useState(null);
  const [explodeQty, setExplodeQty] = useState(1);

  useEffect(() => { fetchBoms(); fetchProducts(); }, []);

  const fetchBoms = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bom');
      setBoms(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (e) { console.error(e); }
  };

  const openCreate = () => { setEditBom(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit   = (bom) => {
    setEditBom(bom);
    setForm({
      finishedProduct: bom.finishedProduct?._id || bom.finishedProduct,
      outputQty:       bom.outputQty,
      version:         bom.version,
      yieldPercent:    bom.yieldPercent,
      instructions:    bom.instructions || '',
      notes:           bom.notes || '',
      components:      bom.components.map(c => ({
        productId:   c.productId?._id || c.productId,
        qty:         c.qty,
        unit:        c.unit,
        scrapFactor: c.scrapFactor || 0,
        notes:       c.notes || ''
      }))
    });
    setError('');
    setShowModal(true);
  };

  const addComponent = () => setForm(f => ({ ...f, components: [...f.components, { ...EMPTY_COMPONENT }] }));
  const removeComponent = (i) => setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));
  const updateComponent = (i, key, val) => setForm(f => {
    const comps = [...f.components];
    comps[i] = { ...comps[i], [key]: val };
    // Auto-fill unit from product
    if (key === 'productId') {
      const p = products.find(p => p._id === val);
      if (p) comps[i].unit = p.unit;
    }
    return { ...f, components: comps };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.components.length === 0) { setError('Add at least one component'); return; }
    setSaving(true); setError('');
    try {
      if (editBom) {
        await api.put(`/bom/${editBom._id}`, form);
      } else {
        await api.post('/bom', form);
      }
      setShowModal(false);
      fetchBoms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save BoM');
    } finally { setSaving(false); }
  };

  const explode = async (bomId) => {
    try {
      const { data } = await api.get(`/bom/${bomId}/explode`, { params: { qty: explodeQty } });
      setExplosion(data);
    } catch (e) { console.error(e); }
  };

  const productName = (id) => products.find(p => p._id === id)?.name || id;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill of Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define raw material requirements for each finished product</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus size={16}/> New BoM
        </button>
      </div>

      {/* BoM list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : boms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No Bills of Materials yet. Create one to enable auto-material planning.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boms.map(bom => (
            <div key={bom._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* BoM header row */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {bom.finishedProduct?.name || '—'}
                      <span className="ml-2 text-xs font-mono text-gray-400">({bom.finishedProduct?.sku})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Produces {bom.outputQty} {bom.finishedProduct?.unit} · Version {bom.version} · Yield {bom.yieldPercent}%
                    </p>
                  </div>
                  {bom.isActive
                    ? <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1"><Check size={10}/>Active</span>
                    : <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">Inactive</span>
                  }
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(bom)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Edit2 size={14}/></button>
                  <button onClick={() => setExpanded(expanded === bom._id ? null : bom._id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                    {expanded === bom._id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                </div>
              </div>

              {/* Expanded view — components + explosion */}
              {expanded === bom._id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Components ({bom.components.length})</p>
                    {/* Explosion calculator */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Explode for qty:</label>
                      <input type="number" min="1" value={explodeQty} onChange={e => setExplodeQty(Number(e.target.value))}
                        className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      <button onClick={() => explode(bom._id)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700">
                        <Zap size={11}/> Explode
                      </button>
                    </div>
                  </div>

                  {/* Components table */}
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-200">
                        <th className="text-left pb-2">Material</th>
                        <th className="text-right pb-2">Qty / run</th>
                        <th className="text-left pb-2 pl-3">Unit</th>
                        <th className="text-right pb-2">Scrap %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.components.map((c, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 text-gray-800">{c.productId?.name || '—'}</td>
                          <td className="py-2 text-right font-mono">{c.qty}</td>
                          <td className="py-2 pl-3 text-gray-500">{c.unit}</td>
                          <td className="py-2 text-right text-gray-500">{c.scrapFactor || 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Explosion result */}
                  {explosion && explosion.bomId === bom._id && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700 mb-2">
                        Required to produce {explosion.productionQty} units:
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {explosion.components.map((c, i) => (
                          <div key={i} className="flex justify-between text-xs text-blue-800">
                            <span>{c.name}</span>
                            <span className="font-mono font-semibold">{c.requiredQty} {c.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bom.instructions && (
                    <div className="mt-3 text-xs text-gray-600 bg-white border border-gray-200 rounded p-3">
                      <span className="font-semibold">Instructions: </span>{bom.instructions}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editBom ? 'Edit BoM' : 'New Bill of Materials'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

              {/* Finished product */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Finished Product *</label>
                  <select required value={form.finishedProduct} onChange={e => setForm({...form, finishedProduct: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Qty per run *</label>
                  <input type="number" min="1" required value={form.outputQty}
                    onChange={e => setForm({...form, outputQty: Number(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yield %</label>
                  <input type="number" min="1" max="100" value={form.yieldPercent}
                    onChange={e => setForm({...form, yieldPercent: Number(e.target.value)})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input value={form.version} onChange={e => setForm({...form, version: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {/* Components */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Components *</label>
                  <button type="button" onClick={addComponent}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Plus size={13}/> Add material
                  </button>
                </div>

                {form.components.length === 0 && (
                  <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-lg">
                    No components yet — click "Add material"
                  </p>
                )}

                <div className="space-y-2">
                  {form.components.map((c, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select value={c.productId} onChange={e => updateComponent(i, 'productId', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">— Material —</option>
                          {products.filter(p => p._id !== form.finishedProduct).map(p =>
                            <option key={p._id} value={p._id}>{p.name}</option>
                          )}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" step="0.01" placeholder="Qty"
                          value={c.qty} onChange={e => updateComponent(i, 'qty', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-2">
                        <input placeholder="Unit" value={c.unit}
                          onChange={e => updateComponent(i, 'unit', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </div>
                      <div className="col-span-2">
                        <input type="number" min="0" max="100" placeholder="Scrap%"
                          value={c.scrapFactor} onChange={e => updateComponent(i, 'scrapFactor', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                      </div>
                      <button type="button" onClick={() => removeComponent(i)}
                        className="col-span-1 p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 flex justify-center">
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturing instructions</label>
                <textarea value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving…' : editBom ? 'Update BoM' : 'Create BoM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
