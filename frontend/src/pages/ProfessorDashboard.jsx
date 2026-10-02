import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BookOpen, CalendarCheck2, GraduationCap, Users } from 'lucide-react'
import api from '../services/api'
import { ContentCard, DataTable, EmptyState, MetricCard, NoticeList, PageHeading, RecordModal, Toast } from '../components/ui'

const today = () => new Date().toISOString().slice(0, 10)
const arrayData = (data) => Array.isArray(data) ? data : data?.results || []

async function fetchAll(path) {
  const results = []
  let next = path
  while (next) {
    const { data } = await api.get(next)
    results.push(...arrayData(data))
    next = Array.isArray(data) ? null : data.next
  }
  return results
}

export default function ProfessorDashboard() {
  const outletContext = useOutletContext() || { activeSection: 'Overview', setActiveSection: () => {} }
  const { activeSection, setActiveSection } = outletContext
  const [dashboard, setDashboard] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [grades, setGrades] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(today())
  const [attendanceStatus, setAttendanceStatus] = useState({})
  const [gradeRecord, setGradeRecord] = useState(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      const [{ data: dashboardData }, enrollmentData] = await Promise.all([api.get('/dashboard/'), fetchAll('/enrollments/')])
      setDashboard(dashboardData)
      setEnrollments(enrollmentData)
      if (!selectedCourse && dashboardData.courses?.length) setSelectedCourse(String(dashboardData.courses[0].id))
      setError('')
    } catch (requestError) { setError(requestError.response?.data?.detail || 'Could not load your teaching workspace.') }
  }, [selectedCourse])

  const loadRecords = useCallback(async () => {
    if (!selectedCourse) { setAttendance([]); setGrades([]); return }
    try {
      const [daily, courseGrades] = await Promise.all([
        fetchAll(`/attendance/?course=${selectedCourse}&date=${attendanceDate}`), fetchAll(`/grades/?course=${selectedCourse}`),
      ])
      setAttendance(daily)
      setAttendanceStatus(Object.fromEntries(daily.map((record) => [record.student, record.status])))
      setGrades(courseGrades)
    } catch (requestError) { setError(requestError.response?.data?.detail || 'Could not load course records.') }
  }, [selectedCourse, attendanceDate])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { loadRecords() }, [loadRecords])

  const courses = dashboard?.courses || []
  const course = courses.find((item) => String(item.id) === String(selectedCourse))
  const roster = useMemo(() => enrollments.filter((enrollment) => String(enrollment.course) === String(selectedCourse)), [enrollments, selectedCourse])
  const currentGrades = useMemo(() => grades, [grades])
  const attendancePresent = Object.values(attendanceStatus).filter((status) => status === 'PRESENT').length

  async function saveAttendance() {
    setSaving(true)
    setError('')
    try {
      const records = roster.map((item) => ({ student: item.student, status: attendanceStatus[item.student] || 'ABSENT' }))
      await api.post('/attendance/bulk/', { course: Number(selectedCourse), date: attendanceDate, records })
      setToast('Attendance register saved.')
      await loadRecords()
    } catch (requestError) { setError(requestError.response?.data?.detail || JSON.stringify(requestError.response?.data || 'Unable to save attendance.')) }
    finally { setSaving(false) }
  }

  async function saveGrade(values) {
    setSaving(true)
    try {
      const body = { ...values, course: Number(selectedCourse), student: Number(values.student), marks_obtained: Number(values.marks_obtained), total_marks: Number(values.total_marks) }
      const editing = Boolean(gradeRecord?.id)
      await api({ method: editing ? 'patch' : 'post', url: `/grades/${editing ? `${gradeRecord.id}/` : ''}`, data: body })
      setGradeRecord(undefined)
      setToast(`Grade ${editing ? 'updated' : 'recorded'}.`)
      await loadRecords()
    } finally { setSaving(false) }
  }

  const gradeColumns = [
    { key: 'student_name', label: 'Student', render: (row) => <><div className="table-primary">{row.student_name}</div><div className="table-secondary">{row.course_code}</div></> },
    { key: 'marks_obtained', label: 'Result', render: (row) => `${row.marks_obtained} / ${row.total_marks}` },
    { key: 'letter_grade', label: 'Grade', render: (row) => <span className="grade-letter">{row.letter_grade}</span> },
  ]

  return <>
    <PageHeading eyebrow="FACULTY PORTAL" title={activeSection === 'Overview' ? `Welcome, ${dashboard?.profile?.first_name || 'Professor'}.` : activeSection} subtitle={activeSection === 'Overview' ? 'Your classes, attendance and student progress at a glance.' : 'Review your assigned courses and keep student records current.'} />
    {error && <div className="form-error" role="alert">{error}</div>}
    {activeSection === 'Overview' && <>
      <div className="metrics-grid"><MetricCard label="Assigned courses" value={courses.length} icon={BookOpen} /><MetricCard label="Students across courses" value={enrollments.length} icon={Users} tint="blue" /><MetricCard label="Attendance marked today" value={attendance.length ? `${attendancePresent}/${attendance.length}` : '—'} icon={CalendarCheck2} tint="purple" /><MetricCard label="Department" value={dashboard?.profile?.department_name || '—'} icon={GraduationCap} tint="amber" /></div>
      <div className="section-grid"><ContentCard title="Your teaching load" subtitle={`${courses.length} assigned courses`}><CourseCards courses={courses} /></ContentCard><ContentCard title="Faculty announcements" subtitle="Notices for your role"><NoticeList notices={dashboard?.notices} /></ContentCard></div>
    </>}
    {activeSection === 'My courses' && <ContentCard title="Assigned courses" subtitle="Select a course to open its attendance and grade tools"><CourseCards courses={courses} onSelect={(id) => { setSelectedCourse(String(id)); setActiveSection('Attendance & grades') }} /></ContentCard>}
    {activeSection === 'Attendance & grades' && <>
      <div className="toolbar"><select className="filter-select" value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}><option value="">Select a course</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.course_code} · {item.course_name}</option>)}</select><label className="filter-select">Date <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} style={{ border: 0, background: 'transparent', color: 'inherit', outline: 0, marginLeft: 5 }} /></label></div>
      <div className="section-grid"><ContentCard title="Attendance register" subtitle={course ? `${course.course_code} · ${roster.length} enrolled students` : 'Choose a course to view the roster'} action={course && <button className="primary-button" onClick={saveAttendance} disabled={saving}>{saving ? 'Saving…' : 'Save register'}</button>}>
        {!course ? <EmptyState title="Select a class" message="Choose one of your assigned courses to open its register." /> : !roster.length ? <EmptyState title="No enrolled students" message="Students will appear here after the administrator enrolls them." /> : <div className="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Attendance</th></tr></thead><tbody>{roster.map((item) => <tr key={item.student}><td className="table-primary">{item.student_name}</td><td>{item.student_id || `#${item.student}`}</td><td><select className="filter-select" value={attendanceStatus[item.student] || 'ABSENT'} onChange={(event) => setAttendanceStatus((current) => ({ ...current, [item.student]: event.target.value }))}><option value="PRESENT">Present</option><option value="ABSENT">Absent</option></select></td></tr>)}</tbody></table></div>}
      </ContentCard><ContentCard title="Course grades" subtitle={course ? `${course.course_code} · ${currentGrades.length} grade records` : 'Select a course'} action={course && <button className="subtle-action" onClick={() => setGradeRecord(null)}>Add grade</button>}><DataTable columns={gradeColumns} rows={currentGrades} onEdit={(row) => setGradeRecord(row)} emptyMessage="There are no grades for this course yet." /></ContentCard></div>
    </>}
    {gradeRecord !== undefined && <RecordModal title={gradeRecord?.id ? 'Update student grade' : 'Record a grade'} subtitle={course ? `${course.course_code} · ${course.course_name}` : 'Grade entry'} record={gradeRecord || {}} fields={[
      { name: 'student', label: 'Student', type: 'select', required: true, options: roster.map((item) => ({ value: item.student, label: item.student_name })) },
      { name: 'marks_obtained', label: 'Marks obtained', type: 'number', min: 0, step: '0.01', required: true },
      { name: 'total_marks', label: 'Total marks', type: 'number', min: 0.01, step: '0.01', required: true },
      { name: 'letter_grade', label: 'Letter grade', type: 'select', required: true, options: ['A', 'B', 'C', 'D', 'F'].map((grade) => ({ value: grade, label: grade })) },
    ]} onClose={() => setGradeRecord(undefined)} onSubmit={saveGrade} saving={saving} />}
    <Toast message={toast} onClose={() => setToast('')} />
  </>
}

function CourseCards({ courses, onSelect }) {
  if (!courses?.length) return <EmptyState title="No courses assigned" message="Your assigned courses will appear here." />
  return <div className="course-grid">{courses.map((course) => <button className="course-tile" key={course.id} onClick={() => onSelect?.(course.id)} style={{ textAlign: 'left', color: 'inherit', cursor: onSelect ? 'pointer' : 'default' }}><div className="course-tile-top"><span className="course-code">{course.course_code}</span><span className="course-credits">{course.credits} CREDITS</span></div><h3>{course.course_name}</h3><p>{course.department_name}</p><div className="course-tile-foot"><span className="avatar">{(course.course_name || 'C').slice(0, 1)}</span>{course.enrollment_count || 0} students enrolled</div></button>)}</div>
}
