import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, UserRound } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to={`/${user.role.toLowerCase()}`} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const account = await login(username.trim(), password)
      navigate(`/${account.role.toLowerCase()}`, { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to sign in. Check your credentials and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-glow login-glow-one" /><div className="login-glow login-glow-two" />
      <section className="login-panel glass-panel">
        <div className="login-brand"><div className="brand-mark"><GraduationCap size={22} /></div><div><b>northstar</b><span>COLLEGE ERP</span></div></div>
        <div className="login-kicker"><span className="live-dot" /> YOUR CAMPUS, IN ONE PLACE</div>
        <h1>Welcome<br />back<span className="accent-dot">.</span></h1>
        <p className="login-subtitle">Sign in to your Northstar workspace and pick up where you left off.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">Username</label>
          <div className="input-wrap"><UserRound size={17} /><input id="username" autoComplete="username" placeholder="Your campus username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div>
          <div className="label-line"><label htmlFor="password">Password</label><span>Secure access</span></div>
          <div className="input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <button className="primary-button login-submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in to workspace'}{!submitting && <ArrowRight size={17} />}</button>
        </form>
        <div className="login-security"><LockKeyhole size={14} /><span>Your session is protected with encrypted authentication.</span></div>
      </section>
      <div className="login-side-note"><span>LEARN · LEAD · BELONG</span><b>A connected campus<br />starts here.</b><small>One secure home for your academic journey.</small></div>
      <div className="login-copyright">NORTHSTAR UNIVERSITY <span>·</span> 2026</div>
    </main>
  )
}
