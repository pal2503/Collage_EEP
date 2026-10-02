import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BookOpen, CalendarCheck2, CalendarDays, GraduationCap, MapPin } from 'lucide-react'
import api from '../services/api'
import { ContentCard, DataTable, EmptyState, MetricCard, NoticeList, PageHeading } from '../components/ui'

export default function StudentDashboard() {
  const outletContext = useOutletContext() || { activeSection: 'Overview', setActiveSection: () => {} }
  const { activeSection } = outletContext
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const loadDashboard = useCallback(async () => {
    try { const { data } = await api.get('/dashboard/'); setDashboard(data); setError('') }
    catch (requestError) { setError(requestError.response?.data?.detail || 'Could not load your student workspace.') }
  }, [])
  useEffect(() => { loadDashboard() }, [loadDashboard])

  const profile = dashboard?.profile
  const grades = dashboard?.grades || []
  const courses = dashboard?.courses || []
  const attendance = dashboard?.attendance || []
  const schedule = useMemo(() => [...(dashboard?.timetable || [])].sort((a, b) => dayOrder(a.day_of_week) - dayOrder(b.day_of_week) || a.time_slot.localeCompare(b.time_slot)), [dashboard?.timetable])
  const overallAttendance = attendance.reduce((totals, record) => ({ present: totals.present + record.present, total: totals.total + record.total }), { present: 0, total: 0 })
  const attendanceRate = overallAttendance.total ? Math.round(100 * overallAttendance.present / overallAttendance.total) : null
  const averageGrade = grades.length ? Math.round(grades.reduce((sum, grade) => sum + (Number(grade.marks_obtained) / Number(grade.total_marks)) * 100, 0) / grades.length) : null

  const gradeColumns = [
    { key: 'course_code', label: 'Course', render: (row) => <><div className="table-primary">{row.course_name}</div><div className="table-secondary">{row.course_code}</div></> },
    { key: 'marks_obtained', label: 'Score', render: (row) => `${row.marks_obtained} / ${row.total_marks}` },
    { key: 'letter_grade', label: 'Grade', render: (row) => <span className="grade-letter">{row.letter_grade}</span> },
  ]
  const attendanceColumns = [
    { key: 'course_name', label: 'Course' }, { key: 'date', label: 'Date', render: (row) => new Date(`${row.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) },
    { key: 'status', label: 'Status', render: (row) => <span className={`status-pill ${row.status === 'ABSENT' ? 'warning' : ''}`}>{row.status}</span> },
  ]
  const scheduleColumns = [
    { key: 'day_of_week', label: 'Day', render: (row) => titleCase(row.day_of_week) },
    { key: 'time_slot', label: 'Time' }, { key: 'course_code', label: 'Course', render: (row) => <><div className="table-primary">{row.course_name}</div><div className="table-secondary">{row.course_code}</div></> },
    { key: 'room_number', label: 'Room', render: (row) => <span><MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 4, color: '#62cfc1' }} />{row.room_number}</span> },
  ]

  return <>
    <PageHeading eyebrow="STUDENT PORTAL" title={activeSection === 'Overview' ? `Hello, ${profile?.first_name || 'Student'}.` : activeSection} subtitle={activeSection === 'Overview' ? 'A clear view of your classes, progress and campus life.' : 'Your academic journey, all together in one place.'} />
    {error && <div className="form-error" role="alert">{error}</div>}
    {!profile && !error && <div className="form-error">Your student account is not linked to a student profile. Contact your campus administrator.</div>}
    {activeSection === 'Overview' && <>
      <section className="profile-strip glass-panel"><div className="profile-large">{`${profile?.first_name?.[0] || 'S'}${profile?.last_name?.[0] || ''}`.toUpperCase()}</div><div><b>{profile ? `${profile.first_name} ${profile.last_name}` : 'Student profile'}</b><small>{profile?.student_id || 'Profile not assigned'} · {profile?.department_name || 'Department pending'}</small></div><div className="profile-details"><div className="profile-detail"><span>Academic year</span><b>{profile?.enrollment_year || '—'}</b></div><div className="profile-detail"><span>Courses</span><b>{courses.length} enrolled</b></div></div></section>
      <div className="metrics-grid"><MetricCard label="Enrolled courses" value={courses.length} icon={BookOpen} /><MetricCard label="Attendance rate" value={attendanceRate === null ? '—' : `${attendanceRate}%`} icon={CalendarCheck2} tint="blue" note="This term" /><MetricCard label="Grade average" value={averageGrade === null ? '—' : `${averageGrade}%`} icon={GraduationCap} tint="purple" note="Across graded courses" /><MetricCard label="Upcoming classes" value={schedule.length} icon={CalendarDays} tint="amber" /></div>
      <div className="section-grid"><ContentCard title="Your courses" subtitle="This semester"><CourseGrid courses={courses.slice(0, 4)} /></ContentCard><ContentCard title="Campus notices" subtitle="Announcements for students"><NoticeList notices={dashboard?.notices} /></ContentCard></div>
      <div className="section-grid"><ContentCard title="Attendance by course" subtitle="Keep an eye on your class participation"><AttendanceSummary records={attendance} /></ContentCard><ContentCard title="Recent grades" subtitle="Your latest course results"><DataTable columns={gradeColumns} rows={grades.slice(0, 5)} emptyMessage="Your results will appear once grades are published." /></ContentCard></div>
    </>}
    {activeSection === 'My courses' && <ContentCard title="My course catalog" subtitle={`${courses.length} enrolled this semester`}><CourseGrid courses={courses} /></ContentCard>}
    {activeSection === 'Academic record' && <>
      <div className="metrics-grid"><MetricCard label="Attendance rate" value={attendanceRate === null ? '—' : `${attendanceRate}%`} icon={CalendarCheck2} /><MetricCard label="Courses graded" value={grades.length} icon={GraduationCap} tint="purple" /><MetricCard label="Grade average" value={averageGrade === null ? '—' : `${averageGrade}%`} icon={BookOpen} tint="blue" /><MetricCard label="Classes recorded" value={overallAttendance.total} icon={CalendarDays} tint="amber" /></div>
      <div className="section-grid"><ContentCard title="Course results" subtitle="Published marks and letter grades"><DataTable columns={gradeColumns} rows={grades} emptyMessage="No grades have been published yet." /></ContentCard><ContentCard title="Attendance percentage" subtitle="Calculated from recorded class meetings"><AttendanceSummary records={attendance} /></ContentCard></div>
      <ContentCard title="Attendance history" subtitle="Recent attendance events"><DataTable columns={attendanceColumns} rows={dashboard?.attendance_history || []} emptyMessage="No attendance has been recorded yet." /></ContentCard>
    </>}
    {activeSection === 'Schedule & notices' && <div className="section-grid"><ContentCard title="Weekly timetable" subtitle="Your enrolled course schedule"><DataTable columns={scheduleColumns} rows={schedule} emptyMessage="Your timetable will appear once classes are scheduled." /></ContentCard><ContentCard title="Campus notices" subtitle="The latest student announcements"><NoticeList notices={dashboard?.notices} /></ContentCard></div>}
  </>
}

function CourseGrid({ courses }) {
  if (!courses?.length) return <EmptyState title="No courses enrolled" message="Your enrolled courses will appear when registration is complete." />
  return <div className="course-grid">{courses.map((course) => <article className="course-tile" key={course.id}><div className="course-tile-top"><span className="course-code">{course.course_code}</span><span className="course-credits">{course.credits} CREDITS</span></div><h3>{course.course_name}</h3><p>{course.department_name}</p><div className="course-tile-foot"><span className="avatar">{(course.professor_name || 'P').slice(0, 1)}</span>{course.professor_name || 'Professor to be assigned'}</div></article>)}</div>
}

function AttendanceSummary({ records }) {
  if (!records?.length) return <EmptyState title="No records yet" message="Attendance percentages will appear after classes are recorded." />
  return <div>{records.map((record) => <div className="record-row" key={record.course_id}><div><b>{record.course_name}</b><small>{record.course_code} · {record.present} of {record.total} present</small></div><div className="attendance-cell"><div className="progress-track"><div className="progress-bar" style={{ width: `${record.percentage ?? 0}%` }} /></div><span>{record.percentage === null ? '—' : `${record.percentage}%`}</span></div></div>)}</div>
}

function dayOrder(value) { return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].indexOf(value) }
function titleCase(value = '') { return value.charAt(0) + value.slice(1).toLowerCase() }
