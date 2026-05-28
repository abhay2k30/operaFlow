import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import {
  Plus, X, Receipt, Search, Filter, Download, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertCircle, XCircle, IndianRupee, FileText, RefreshCw
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const GST_RATES = [0, 5, 12, 18, 28];

const STATUS_META = {
  Draft:         { label: 'Draft',          color: 'bg-gray-100 text-gray-600',   icon: FileText },
  Issued:        { label: 'Issued',         color: 'bg-blue-100 text-blue-700',   icon: Clock },
  Paid:          { label: 'Paid',           color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PartiallyPaid: { label: 'Partially Paid', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  Cancelled:     { label: 'Cancelled',      color: 'bg-red-100 text-red-600',     icon: XCircle },
};

const EMPTY_LINE = { description: '', hsnCode: '', qty: 1, unit: 'nos', unitPrice: 0, discount: 0, gstRate: 18 };

const EMPTY_FORM = {
  type: 'Sales',
  party: '',
  soRef: '',
  poRef: '',
  supplyType: 'Intra-State',
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  notes: '',
  termsAndConditions: 'Goods once sold will not be taken back. Subject to local jurisdiction.',
  lineItems: [{ ...EMPTY_LINE }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function computeLine(item, supplyType) {
  const qty        = Number(item.qty) || 0;
  const unitPrice  = Number(item.unitPrice) || 0;
  const discount   = Number(item.discount) || 0;
  const gstRate    = Number(item.gstRate) || 0;
  const taxableAmt = parseFloat(((qty * unitPrice) - discount).toFixed(2));
  let cgst = 0, sgst = 0, igst = 0;
  if (supplyType === 'Inter-State') {
    igst = parseFloat((taxableAmt * gstRate / 100).toFixed(2));
  } else {
    cgst = parseFloat((taxableAmt * (gstRate / 2) / 100).toFixed(2));
    sgst = cgst;
  }
  return { ...item, taxableAmt, cgst, sgst, igst, totalAmt: parseFloat((taxableAmt + cgst + sgst + igst).toFixed(2)) };
}

function computeTotals(lineItems, supplyType) {
  const lines      = lineItems.map(l => computeLine(l, supplyType));
  const subtotal   = parseFloat(lines.reduce((s, l) => s + l.taxableAmt, 0).toFixed(2));
  const totalCgst  = parseFloat(lines.reduce((s, l) => s + l.cgst, 0).toFixed(2));
  const totalSgst  = parseFloat(lines.reduce((s, l) => s + l.sgst, 0).toFixed(2));
  const totalIgst  = parseFloat(lines.reduce((s, l) => s + l.igst, 0).toFixed(2));
  const totalTax   = parseFloat((totalCgst + totalSgst + totalIgst).toFixed(2));
  const rawTotal   = subtotal + totalTax;
  const roundOff   = parseFloat((Math.round(rawTotal) - rawTotal).toFixed(2));
  const grandTotal = parseFloat((rawTotal + roundOff).toFixed(2));
  return { lines, subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff, grandTotal };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.Draft;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.color}`}>
      <Icon size={10} />{m.label}
    </span>
  );
}

function SummaryCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Invoices() {
  const [invoices, setInvoices]   = useState([]);
  const [parties, setParties]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGstSummary, setShowGstSummary] = useState(false);
  const [gstSummary, setGstSummary]         = useState(null);

  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [expanded, setExpanded]   = useState(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Live totals (calculated as form changes)
  const totals = computeTotals(form.lineItems, form.supplyType);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes, partyRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/parties'),
      ]);
      setInvoices(invRes.data);
      setParties(partyRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchGstSummary = async () => {
    try {
      const { data } = await api.get('/invoices/gst-summary', {
        params: { type: 'Sales', from: `${new Date().getFullYear()}-04-01` }
      });
      setGstSummary(data);
      setShowGstSummary(true);
    } catch (e) { console.error(e); }
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setShowModal(true); };

  const setLine = (i, key, val) => setForm(f => {
    const items = [...f.lineItems];
    items[i] = { ...items[i], [key]: val };
    return { ...f, lineItems: items };
  });

  const addLine    = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { ...EMPTY_LINE }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.lineItems.length === 0) { setError('Add at least one line item'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/invoices', form);
      setShowModal(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally { setSaving(false); }
  };

  const updateStatus = async (id, status, paidAmount) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status, paidAmount });
      fetchAll();
    } catch (e) { alert('Failed to update status'); }
  };

  const downloadPdf = async (id, invoiceNo) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      // If server returns blob (pdfkit), trigger download
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `${invoiceNo.replace(/\//g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // pdfkit not installed — JSON fallback
      alert('PDF download: install pdfkit on server (npm install pdfkit)');
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filtered = invoices.filter(inv => {
    const name = inv.party?.name || '';
    const no   = inv.invoiceNo   || '';
    const matchSearch = search === '' ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      no.toLowerCase().includes(search.toLowerCase());
    const matchType   = filterType   === 'All' || inv.type   === filterType;
    const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const kpis = {
    total:       invoices.reduce((s, i) => s + (i.grandTotal || 0), 0),
    outstanding: invoices.filter(i => ['Issued','PartiallyPaid'].includes(i.status))
                         .reduce((s, i) => s + ((i.grandTotal || 0) - (i.paidAmount || 0)), 0),
    paid:        invoices.filter(i => i.status === 'Paid').length,
    draft:       invoices.filter(i => i.status === 'Draft').length,
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sales &amp; purchase invoices with GST computation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchGstSummary}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            <IndianRupee size={15}/> GST Summary
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
            <Plus size={16}/> New Invoice
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Invoiced"    value={fmt(kpis.total)}       sub={`${invoices.length} invoices`} />
        <SummaryCard label="Outstanding"       value={fmt(kpis.outstanding)} color="text-amber-600" sub="Unpaid / partial" />
        <SummaryCard label="Paid Invoices"     value={kpis.paid}             color="text-green-600" sub="Fully settled" />
        <SummaryCard label="Drafts"            value={kpis.draft}            color="text-gray-500"  sub="Not yet issued" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search party or invoice no…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex gap-2">
          {['All','Sales','Purchase'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                ${filterType === t ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="All">All statuses</option>
          {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400"><RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-40"/>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Receipt size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No invoices found. Create your first GST invoice.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Party</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Taxable</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">GST</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3"/>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <React.Fragment key={inv._id}>
                  <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.party?.name || '—'}</p>
                      {inv.party?.gstin && <p className="text-xs font-mono text-gray-400">{inv.party.gstin}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        inv.type === 'Sales' ? 'bg-teal-50 text-teal-700' : 'bg-orange-50 text-orange-700'
                      }`}>{inv.type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(inv.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(inv.totalTax)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmt(inv.grandTotal)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status}/></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => downloadPdf(inv._id, inv.invoiceNo)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="Download PDF">
                          <Download size={14}/>
                        </button>
                        <button onClick={() => setExpanded(expanded === inv._id ? null : inv._id)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                          {expanded === inv._id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expanded === inv._id && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="px-6 py-5">
                        <div className="grid grid-cols-3 gap-6">

                          {/* Line items */}
                          <div className="col-span-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Line Items</p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 border-b border-gray-200">
                                  <th className="text-left pb-1.5">Description</th>
                                  <th className="text-right pb-1.5">HSN</th>
                                  <th className="text-right pb-1.5">Qty</th>
                                  <th className="text-right pb-1.5">Rate</th>
                                  <th className="text-right pb-1.5">Taxable</th>
                                  <th className="text-right pb-1.5">GST</th>
                                  <th className="text-right pb-1.5">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(inv.lineItems || []).map((li, i) => (
                                  <tr key={i} className="border-b border-gray-100 last:border-0">
                                    <td className="py-1.5 text-gray-800">{li.description}</td>
                                    <td className="py-1.5 text-right font-mono text-gray-500">{li.hsnCode || '—'}</td>
                                    <td className="py-1.5 text-right text-gray-700">{li.qty} {li.unit}</td>
                                    <td className="py-1.5 text-right font-mono text-gray-700">{fmt(li.unitPrice)}</td>
                                    <td className="py-1.5 text-right font-mono text-gray-700">{fmt(li.taxableAmt)}</td>
                                    <td className="py-1.5 text-right text-gray-500">{li.gstRate}%</td>
                                    <td className="py-1.5 text-right font-mono font-semibold text-gray-800">{fmt(li.totalAmt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Totals + actions */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Summary</p>
                            <div className="space-y-1 text-sm bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono">{fmt(inv.subtotal)}</span></div>
                              {inv.totalCgst > 0 && <>
                                <div className="flex justify-between text-gray-600"><span>CGST</span><span className="font-mono">{fmt(inv.totalCgst)}</span></div>
                                <div className="flex justify-between text-gray-600"><span>SGST</span><span className="font-mono">{fmt(inv.totalSgst)}</span></div>
                              </>}
                              {inv.totalIgst > 0 &&
                                <div className="flex justify-between text-gray-600"><span>IGST</span><span className="font-mono">{fmt(inv.totalIgst)}</span></div>}
                              {inv.roundOff !== 0 &&
                                <div className="flex justify-between text-gray-400"><span>Round off</span><span className="font-mono">{fmt(inv.roundOff)}</span></div>}
                              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                                <span>Grand Total</span><span className="font-mono">{fmt(inv.grandTotal)}</span>
                              </div>
                            </div>

                            {/* Status actions */}
                            <p className="text-xs font-semibold text-gray-500 uppercase mt-3 mb-2">Update Status</p>
                            <div className="flex flex-col gap-2">
                              {inv.status === 'Draft' && (
                                <button onClick={() => updateStatus(inv._id, 'Issued')}
                                  className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
                                  Issue Invoice
                                </button>
                              )}
                              {['Issued','PartiallyPaid'].includes(inv.status) && (
                                <button onClick={() => updateStatus(inv._id, 'Paid', inv.grandTotal)}
                                  className="w-full bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                                  Mark as Paid
                                </button>
                              )}
                              {['Issued','PartiallyPaid'].includes(inv.status) && (
                                <button onClick={() => {
                                  const amt = parseFloat(prompt('Enter amount received:', inv.paidAmount || 0));
                                  if (!isNaN(amt)) updateStatus(inv._id, 'PartiallyPaid', amt);
                                }}
                                  className="w-full border border-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50">
                                  Record Partial Payment
                                </button>
                              )}
                              {['Draft','Issued'].includes(inv.status) && (
                                <button onClick={() => { if (confirm('Cancel this invoice?')) updateStatus(inv._id, 'Cancelled'); }}
                                  className="w-full border border-red-200 text-red-600 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50">
                                  Cancel
                                </button>
                              )}
                            </div>

                            {inv.amountInWords && (
                              <p className="text-xs text-gray-400 italic mt-3 leading-relaxed">{inv.amountInWords}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Invoice Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Invoice</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-5">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

                {/* Header fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type *</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Sales">Sales Invoice</option>
                      <option value="Purchase">Purchase Invoice</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party *</label>
                    <select required value={form.party} onChange={e => setForm({...form, party: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Select party —</option>
                      {parties
                        .filter(p => form.type === 'Sales'
                          ? ['Customer','Both'].includes(p.type)
                          : ['Supplier','Both'].includes(p.type))
                        .map(p => <option key={p._id} value={p._id}>{p.name} {p.gstin ? `(${p.gstin})` : ''}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supply Type *</label>
                    <select value={form.supplyType} onChange={e => setForm({...form, supplyType: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="Intra-State">Intra-State (CGST + SGST)</option>
                      <option value="Inter-State">Inter-State (IGST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                    <input type="date" value={form.invoiceDate} onChange={e => setForm({...form, invoiceDate: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Line Items *</label>
                    <button type="button" onClick={addLine}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <Plus size={13}/> Add line
                    </button>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 mb-1 px-1">
                    {['Description','HSN Code','Qty','Unit','Rate (₹)','Disc (₹)',`GST %`,''].map((h, i) => (
                      <p key={i} className={`text-xs text-gray-400 font-medium ${
                        i === 0 ? 'col-span-3' : i === 1 ? 'col-span-1' : i === 7 ? 'col-span-1' : 'col-span-1'
                      }`}>{h}</p>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {form.lineItems.map((line, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <input value={line.description} onChange={e => setLine(i, 'description', e.target.value)}
                            placeholder="Item description" required
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="col-span-1">
                          <input value={line.hsnCode} onChange={e => setLine(i, 'hsnCode', e.target.value)}
                            placeholder="HSN"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="col-span-1">
                          <input type="number" min="0" step="0.01" value={line.qty}
                            onChange={e => setLine(i, 'qty', e.target.value)} required
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="col-span-1">
                          <input value={line.unit} onChange={e => setLine(i, 'unit', e.target.value)}
                            placeholder="nos"
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="col-span-2">
                          <input type="number" min="0" step="0.01" value={line.unitPrice}
                            onChange={e => setLine(i, 'unitPrice', e.target.value)} required
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="col-span-1">
                          <input type="number" min="0" step="0.01" value={line.discount}
                            onChange={e => setLine(i, 'discount', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                        </div>
                        <div className="col-span-1">
                          <select value={line.gstRate} onChange={e => setLine(i, 'gstRate', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </div>
                        <div className="col-span-1 text-right text-xs font-mono font-semibold text-gray-700">
                          {fmt(computeLine(line, form.supplyType).totalAmt)}
                        </div>
                        <button type="button" onClick={() => removeLine(i)}
                          className="col-span-1 flex justify-center p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-300">
                          <X size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live totals */}
                <div className="flex justify-end">
                  <div className="w-72 space-y-1 text-sm border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono">{fmt(totals.subtotal)}</span></div>
                    {form.supplyType === 'Intra-State' ? <>
                      <div className="flex justify-between text-gray-600"><span>CGST</span><span className="font-mono">{fmt(totals.totalCgst)}</span></div>
                      <div className="flex justify-between text-gray-600"><span>SGST</span><span className="font-mono">{fmt(totals.totalSgst)}</span></div>
                    </> : (
                      <div className="flex justify-between text-gray-600"><span>IGST</span><span className="font-mono">{fmt(totals.totalIgst)}</span></div>
                    )}
                    {totals.roundOff !== 0 &&
                      <div className="flex justify-between text-gray-400"><span>Round off</span><span className="font-mono">{fmt(totals.roundOff)}</span></div>}
                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Grand Total</span><span className="font-mono text-base">{fmt(totals.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terms &amp; Conditions</label>
                    <textarea value={form.termsAndConditions} onChange={e => setForm({...form, termsAndConditions: e.target.value})} rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-5 pb-5">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Creating…' : `Create Invoice — ${fmt(totals.grandTotal)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GST Summary Modal ────────────────────────────────────────────────── */}
      {showGstSummary && gstSummary && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">GST Summary — Current FY</h2>
              <button onClick={() => setShowGstSummary(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Supply type breakdown */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">By supply type</p>
                <div className="space-y-2">
                  {(gstSummary.supplyTypeSummary || []).map(row => (
                    <div key={row._id} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                      <span className="font-medium text-gray-800">{row._id}</span>
                      <div className="flex gap-6 text-gray-600">
                        <span>Taxable: <span className="font-mono font-semibold">{fmt(row.subtotal)}</span></span>
                        <span>CGST: <span className="font-mono">{fmt(row.totalCgst)}</span></span>
                        <span>SGST: <span className="font-mono">{fmt(row.totalSgst)}</span></span>
                        {row.totalIgst > 0 && <span>IGST: <span className="font-mono">{fmt(row.totalIgst)}</span></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate-wise breakdown */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Rate-wise (for GSTR filing)</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-200">
                      <th className="text-left pb-2">GST Rate</th>
                      <th className="text-right pb-2">Taxable Amt</th>
                      <th className="text-right pb-2">CGST</th>
                      <th className="text-right pb-2">SGST</th>
                      <th className="text-right pb-2">IGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(gstSummary.rateWiseSummary || []).map(row => (
                      <tr key={row._id} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 font-semibold">{row._id}%</td>
                        <td className="py-2 text-right font-mono">{fmt(row.taxableAmt)}</td>
                        <td className="py-2 text-right font-mono text-gray-600">{fmt(row.cgst)}</td>
                        <td className="py-2 text-right font-mono text-gray-600">{fmt(row.sgst)}</td>
                        <td className="py-2 text-right font-mono text-gray-600">{fmt(row.igst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
