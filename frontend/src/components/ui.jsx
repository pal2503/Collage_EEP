import { useEffect, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'

export function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action || <span className="date-label">ACADEMIC YEAR 2026 — 2027</span>}</div>
}

export function MetricCard({ label, value, icon: Icon, tint = '', note = 'Current total' }) {
  return <article className="metric-card"><div className="metric-top"><div className={`metric-icon ${tint}`}>{Icon && <Icon size={16} />}</div><span className="metric-trend">{note}</span></div><div className="metric-value">{value ?? '—'}</div><div className="metric-label">{label}</div></article>
}

export function ContentCard({ title, subtitle, action, children, className = '' }) {
  return <section className={`content-card ${className}`}><div className="card-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>
}

export function EmptyState({ title = 'Nothing here yet', message = 'Records will appear here once they are added.' }) {
  return <div className="empty-state"><strong>{title}</strong>{message}</div>
}

export function DataTable({ columns, rows, onEdit, onDelete, emptyMessage }) {
  if (!rows?.length) return <EmptyState message={emptyMessage} />
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{(onEdit || onDelete) && <th>Actions</th>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? '—'}</td>)}{(onEdit || onDelete) && <td><div className="row-actions">{onEdit && <button className="subtle-action" onClick={() => onEdit(row)}>Edit</button>}{onDelete && <button className="danger-button" onClick={() => onDelete(row)}>Delete</button>}</div></td>}</tr>)}</tbody></table></div>
}

export function SearchBox({ value, onChange, placeholder = 'Search records…' }) {
  return <label className="search-box"><Search size={15} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>
}

export function Toast({ message, onClose }) {
  useEffect(() => { if (!message) return undefined; const timer = setTimeout(onClose, 3400); return () => clearTimeout(timer) }, [message, onClose])
  return message ? <div className="toast"><Check size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} />{message}</div> : null
}

export function RecordModal({ title, subtitle, fields, record, onClose, onSubmit, saving = false }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, record?.[field.name] ?? field.defaultValue ?? ''])))
  const [error, setError] = useState('')
  function update(field, value) { setValues((current) => ({ ...current, [field]: value })) }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try { await onSubmit(values) } catch (requestError) {
      const detail = requestError.response?.data
      setError(typeof detail === 'string' ? detail : detail?.detail || Object.entries(detail || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n') || 'Unable to save this record.')
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    <form className="modal-form" onSubmit={submit}>{fields.map((field) => <div className={`form-field ${field.full ? 'full' : ''}`} key={field.name}><label htmlFor={`field-${field.name}`}>{field.label}{field.required && ' *'}</label>{field.type === 'select' ? <select id={`field-${field.name}`} value={values[field.name]} onChange={(event) => update(field.name, event.target.value)} required={field.required} disabled={field.disabled}><option value="">Select {field.label.toLowerCase()}</option>{(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea id={`field-${field.name}`} value={values[field.name]} onChange={(event) => update(field.name, event.target.value)} required={field.required} placeholder={field.placeholder} /> : <input id={`field-${field.name}`} type={field.type || 'text'} value={values[field.name]} onChange={(event) => update(field.name, event.target.value)} required={field.required} min={field.min} max={field.max} step={field.step} placeholder={field.placeholder} autoComplete={field.type === 'password' ? 'new-password' : undefined} />}</div>)}{error && <div className="error-detail" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : <><Plus size={14} />Save record</>}</button></div></form>
  </section></div>
}

export function NoticeList({ notices }) {
  if (!notices?.length) return <EmptyState title="All caught up" message="There are no campus notices to show." />
  return <div className="notice-list">{notices.map((notice) => <article className="notice-item" key={notice.id}><div className="notice-meta"><span />{notice.target_role === 'ALL' ? 'CAMPUS NOTICE' : `${notice.target_role} NOTICE`} · {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : 'JUST POSTED'}</div><b>{notice.title}</b><p>{notice.message}</p></article>)}</div>
}
