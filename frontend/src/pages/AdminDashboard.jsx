import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BookOpen, Building2, GraduationCap, Plus, Users } from 'lucide-react'
import api from '../services/api'
import { ContentCard, DataTable, MetricCard, NoticeList, PageHeading, RecordModal, SearchBox, Toast } from '../components/ui'

const collectionBySection = { Students: 'students', Professors: 'professors', Courses: 'courses', Departments: 'departments', Enrollments: 'enrollments', Notices: 'notifications' }
const pluralLabels = { students: 'students', professors: 'professors', courses: 'courses', departments: 'departments', enrollments: 'enrollments', notifications: 'notices' }
const blankFields = { Students: ['username', 'email', 'password', 'student_id', 'first_name', 'last_name', 'department', 'enrollment_year'], Professors: ['username', 'email', 'password', 'professor_id', 'first_name', 'last_name', 'department', 'designation'], Courses: ['course_code', 'course_name', 'credits', 'department', 'assigned_professor'], Departments: ['department_code', 'department_name', 'head_of_department'], Enrollments: ['student', 'course'] }

function normalizeRows(data) { return Array.isArray(data) ? data : data?.results || [] }

async function fetchAll(path) {
  const results = []
  let next = path
  while (next) {
    const { data } = await api.get(next)
    results.push(...normalizeRows(data))
    next = Array.isArray(data) ? null : data.next
  }
  return results
}

export default function AdminDashboard() {
  const outletContext = useOutletContext() || { activeSection: 'Overview', setActiveSection: () => {} }
  const { activeSection } = outletContext
  const [dashboard, setDashboard] = useState(null)
  const [rows, setRows] = useState([])
  const [departments, setDepartments] = useState([])
  const [professors, setProfessors] = useState([])
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [query, setQuery] = useState('')
  const [modalRecord, setModalRecord] = useState(undefined)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const notify = useCallback((message) => setToast(message), [])
  const loadDashboard = useCallback(async () => {
    try { const { data } = await api.get('/dashboard/'); setDashboard(data); setError('') }
    catch { setError('Unable to load the admin overview. Check your connection and try again.') }
  }, [])
  const loadResources = useCallback(async () => {
    const [departmentData, professorData, studentData, courseData] = await Promise.all([
      fetchAll('/departments/'), fetchAll('/professors/'), fetchAll('/students/'), fetchAll('/courses/'),
    ])
    setDepartments(departmentData); setProfessors(professorData)
    setStudents(studentData); setCourses(courseData)
  }, [])
  const loadRows = useCallback(async () => {
    const endpoint = collectionBySection[activeSection]
    if (!endpoint) return
    try { setRows(await fetchAll(`/${endpoint}/`)); setError('') }
    catch (requestError) { setRows([]); setError(requestError.response?.data?.detail || `Unable to load ${pluralLabels[endpoint]}.`) }
  }, [activeSection])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { loadResources().catch(() => {}) }, [loadResources])
  useEffect(() => { loadRows() }, [loadRows])

  const filteredRows = useMemo(() => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [rows, query])
  const resource = collectionBySection[activeSection]
  const label = activeSection === 'Overview' ? 'Campus overview' : activeSection
  const nameMaps = {
    department: Object.fromEntries(departments.map((item) => [item.id, item.department_name])),
    professor: Object.fromEntries(professors.map((item) => [item.id, `${item.first_name} ${item.last_name}`])),
    student: Object.fromEntries(students.map((item) => [item.id, `${item.first_name} ${item.last_name} · ${item.student_id}`])),
    course: Object.fromEntries(courses.map((item) => [item.id, `${item.course_code} · ${item.course_name}`])),
  }
  const fields = useMemo(() => buildFields(activeSection, departments, professors, students, courses, modalRecord), [activeSection, departments, professors, students, courses, modalRecord])

  function startCreate() { setModalRecord(null) }
  function startEdit(record) {
    const normalized = { ...record, username: record.account_username || '', email: record.account_email || '' }
    setModalRecord(normalized)
  }

  async function submitRecord(values) {
    setSaving(true)
    try {
      const body = { ...values }
      for (const key of ['department', 'assigned_professor', 'head_of_department', 'student', 'course', 'credits', 'enrollment_year']) {
        if (body[key] !== '' && body[key] !== undefined) body[key] = Number(body[key])
      }
      Object.keys(body).forEach((key) => { if (body[key] === '') delete body[key] })
      const editing = Boolean(modalRecord?.id)
      await api({ method: editing ? 'patch' : 'post', url: `/${resource}/` + (editing ? `${modalRecord.id}/` : ''), data: body })
      setModalRecord(undefined)
      notify(`${activeSection.slice(0, -1)} ${editing ? 'updated' : 'created'} successfully.`)
      await Promise.all([loadRows(), loadDashboard(), loadResources()])
    } finally { setSaving(false) }
  }

  async function deleteRecord(record) {
    if (!window.confirm(`Delete this ${activeSection.slice(0, -1).toLowerCase()}? This action cannot be undone.`)) return
    try { await api.delete(`/${resource}/${record.id}/`); notify('Record deleted.'); await Promise.all([loadRows(), loadDashboard(), loadResources()]) }
    catch (requestError) { setError(requestError.response?.data?.detail || 'Unable to delete this record.') }
  }

  const columns = getColumns(activeSection, nameMaps)
  return <>
    <PageHeading eyebrow="ADMINISTRATOR PORTAL" title={activeSection === 'Overview' ? 'Good morning, Admin.' : activeSection} subtitle={activeSection === 'Overview' ? 'Here’s what’s happening across your campus today.' : `Manage ${activeSection.toLowerCase()} records and keep your campus data up to date.`} action={activeSection !== 'Overview' ? <button className="primary-button" onClick={startCreate}><Plus size={15} />Add {activeSection === 'Notices' ? 'notice' : activeSection === 'Enrollments' ? 'enrollment' : activeSection.slice(0, -1)}</button> : undefined} />
    {error && <div className="form-error" role="alert">{error}</div>}
    {activeSection === 'Overview' ? <>
      <div className="metrics-grid"><MetricCard label="Enrolled students" value={dashboard?.metrics?.students ?? '—'} icon={GraduationCap} /><MetricCard label="Faculty members" value={dashboard?.metrics?.professors ?? '—'} icon={Users} tint="blue" /><MetricCard label="Active courses" value={dashboard?.metrics?.courses ?? '—'} icon={BookOpen} tint="purple" /><MetricCard label="Departments" value={dashboard?.metrics?.departments ?? '—'} icon={Building2} tint="amber" /></div>
      <div className="section-grid"><ContentCard title="Academic structure" subtitle={`${dashboard?.metrics?.enrollments ?? 0} course enrollments across campus`} action={<button className="subtle-action" onClick={loadDashboard}>Refresh</button>}><div className="record-row"><div><b>Student community</b><small>Active student accounts</small></div><span>{dashboard?.metrics?.students ?? '—'}</span><span className="status-pill">ACTIVE</span></div><div className="record-row"><div><b>Teaching faculty</b><small>Professors with campus access</small></div><span>{dashboard?.metrics?.professors ?? '—'}</span><span className="status-pill">ACTIVE</span></div><div className="record-row"><div><b>Course catalog</b><small>Courses available this term</small></div><span>{dashboard?.metrics?.courses ?? '—'}</span><span className="status-pill neutral">CATALOG</span></div><div className="record-row"><div><b>Departments</b><small>Academic departments</small></div><span>{dashboard?.metrics?.departments ?? '—'}</span><span className="status-pill neutral">SCHOOL</span></div></ContentCard><ContentCard title="Campus notices" subtitle="Recent announcements"><NoticeList notices={dashboard?.notices} /></ContentCard></div>
    </> : <ContentCard title={`${activeSection} directory`} subtitle={`${filteredRows.length} records`} action={<SearchBox value={query} onChange={setQuery} />}><DataTable columns={columns} rows={filteredRows} onEdit={activeSection === 'Enrollments' ? undefined : startEdit} onDelete={deleteRecord} emptyMessage={`No ${activeSection.toLowerCase()} found. Use the add button to create the first record.`} /></ContentCard>}
    {modalRecord !== undefined && <RecordModal title={`${modalRecord?.id ? 'Edit' : 'Add'} ${activeSection.slice(0, -1)}`} subtitle="Fields marked with * are required." fields={fields} record={modalRecord || {}} onClose={() => setModalRecord(undefined)} onSubmit={submitRecord} saving={saving} />}
    <Toast message={toast} onClose={() => setToast('')} />
  </>
}

function selectField(name, label, records, labelFn, required = true) {
  return { name, label, type: 'select', required, options: records.map((item) => ({ value: item.id, label: labelFn(item) })) }
}

function buildFields(section, departments, professors, students, courses, record) {
  if (section === 'Students') return [
    { name: 'username', label: 'Username', required: !record?.id }, { name: 'email', label: 'Email address', type: 'email', required: !record?.id },
    { name: 'password', label: record?.id ? 'New password (optional)' : 'Temporary password', type: 'password', required: !record?.id },
    { name: 'student_id', label: 'Student ID', required: true }, { name: 'first_name', label: 'First name', required: true }, { name: 'last_name', label: 'Last name', required: true },
    selectField('department', 'Department', departments, (item) => `${item.department_code} · ${item.department_name}`),
    { name: 'enrollment_year', label: 'Enrollment year', type: 'number', min: 1900, max: 2200, required: true },
  ]
  if (section === 'Professors') return [
    { name: 'username', label: 'Username', required: !record?.id }, { name: 'email', label: 'Email address', type: 'email', required: !record?.id },
    { name: 'password', label: record?.id ? 'New password (optional)' : 'Temporary password', type: 'password', required: !record?.id },
    { name: 'professor_id', label: 'Professor ID', required: true }, { name: 'first_name', label: 'First name', required: true }, { name: 'last_name', label: 'Last name', required: true },
    selectField('department', 'Department', departments, (item) => `${item.department_code} · ${item.department_name}`),
    { name: 'designation', label: 'Designation', required: true },
  ]
  if (section === 'Courses') return [
    { name: 'course_code', label: 'Course code', required: true }, { name: 'course_name', label: 'Course name', required: true },
    { name: 'credits', label: 'Credits', type: 'number', min: 1, max: 10, required: true },
    selectField('department', 'Department', departments, (item) => item.department_name),
    selectField('assigned_professor', 'Assigned professor', professors, (item) => `${item.first_name} ${item.last_name}`, false),
  ]
  if (section === 'Departments') return [
    { name: 'department_code', label: 'Department code', required: true }, { name: 'department_name', label: 'Department name', required: true },
    selectField('head_of_department', 'Department head', professors, (item) => `${item.first_name} ${item.last_name}`, false),
  ]
  if (section === 'Notices') return [
    { name: 'title', label: 'Notice title', required: true },
    { name: 'message', label: 'Message', type: 'textarea', full: true, required: true },
    { name: 'target_role', label: 'Audience', type: 'select', required: true, defaultValue: 'ALL', options: [
      { value: 'ALL', label: 'Everyone' }, { value: 'STUDENT', label: 'Students' }, { value: 'PROFESSOR', label: 'Professors' },
    ] },
  ]
  return [selectField('student', 'Student', students, (item) => `${item.first_name} ${item.last_name} · ${item.student_id}`), selectField('course', 'Course', courses, (item) => `${item.course_code} · ${item.course_name}`)]
}

function getColumns(section, maps) {
  if (section === 'Students') return [
    { key: 'student_id', label: 'Student' , render: (r) => <><div className="table-primary">{r.first_name} {r.last_name}</div><div className="table-secondary">{r.student_id}</div></> },
    { key: 'account_email', label: 'Email' }, { key: 'department_name', label: 'Department' }, { key: 'enrollment_year', label: 'Enrolled' },
  ]
  if (section === 'Professors') return [
    { key: 'professor_id', label: 'Faculty member', render: (r) => <><div className="table-primary">{r.first_name} {r.last_name}</div><div className="table-secondary">{r.professor_id} · {r.designation}</div></> },
    { key: 'account_email', label: 'Email' }, { key: 'department_name', label: 'Department' },
  ]
  if (section === 'Courses') return [
    { key: 'course_code', label: 'Course', render: (r) => <><div className="table-primary">{r.course_name}</div><div className="table-secondary">{r.course_code}</div></> },
    { key: 'department_name', label: 'Department' }, { key: 'professor_name', label: 'Professor' }, { key: 'credits', label: 'Credits' }, { key: 'enrollment_count', label: 'Students' },
  ]
  if (section === 'Departments') return [
    { key: 'department_code', label: 'Code' }, { key: 'department_name', label: 'Department' }, { key: 'head_name', label: 'Department head' },
  ]
  if (section === 'Notices') return [
    { key: 'title', label: 'Notice', render: (r) => <><div className="table-primary">{r.title}</div><div className="table-secondary">{r.message}</div></> },
    { key: 'target_role', label: 'Audience' }, { key: 'created_at', label: 'Published', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ]
  return [
    { key: 'student', label: 'Student', render: (r) => maps.student[r.student] || r.student_name },
    { key: 'course', label: 'Course', render: (r) => maps.course[r.course] || `${r.course_code || ''} ${r.course_name || ''}` },
    { key: 'enrollment_date', label: 'Enrollment date' },
  ]
}
