import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = '/api'
const SERVER_ORIGIN = import.meta.env.VITE_SERVER_ORIGIN || 'http://localhost:5000'

const palette = {
  bg: '#f5efe4',
  panelStrong: '#fffdf8',
  line: '#d5c6af',
  ink: '#1b1711',
  muted: '#695f52',
  accent: '#b45a2f',
  accentSoft: '#f2d4c4',
  good: '#1f6a48',
  goodSoft: '#dff4e7',
  bad: '#8a2f2f',
  badSoft: '#f6dddd',
  shadow: '0 20px 50px rgba(75, 45, 18, 0.12)',
}

const cardStyle = {
  background: palette.panelStrong,
  border: `1px solid ${palette.line}`,
  borderRadius: 24,
  boxShadow: palette.shadow,
  padding: 32,
  wordWrap: 'break-word',
  overflowWrap: 'anywhere',
}

const inputStyle = {
  width: '100%',
  borderRadius: 18,
  border: `1px solid ${palette.line}`,
  padding: '13px 14px',
  fontSize: 15,
  color: palette.ink,
  background: '#fffdf9',
  boxSizing: 'border-box',
}

const buttonStyles = {
  primary: {
    background: palette.ink,
    color: '#fffaf2',
    border: 'none',
    borderRadius: 999,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondary: {
    background: 'transparent',
    color: palette.ink,
    border: `1px solid ${palette.line}`,
    borderRadius: 999,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  accent: {
    background: palette.accent,
    color: '#fffaf2',
    border: 'none',
    borderRadius: 999,
    padding: '12px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
}

const innerCardStyle = {
  borderRadius: 20,
  border: `1px solid ${palette.line}`,
  background: '#fffbf6',
  padding: 28,
  wordWrap: 'break-word',
  overflowWrap: 'anywhere',
}

async function apiFetch(path, { token, body, headers = {}, ...options } = {}) {
  const finalHeaders = { ...headers }
  if (token) finalHeaders.Authorization = `Bearer ${token}`
  const isFormData = body instanceof FormData
  if (body && !isFormData) finalHeaders['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: finalHeaders,
    body: isFormData || body == null ? body : JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

function pct(value) {
  return `${Math.round((value || 0) * 100)}%`
}

function blankRole() {
  return {
    company_name: '',
    job_title: '',
    start_date: '',
    end_date: '',
    is_present: false,
    key_duties: '',
  }
}

function blankEducation() {
  return {
    institution_name: '',
    degree: '',
    year_completed: '',
    cgpa: '',
  }
}

function blankProfile(user) {
  return {
    personalInfo: {
      full_name: user?.name || '',
      email: user?.email || '',
      phone: '',
      city: '',
    },
    employmentHistory: [blankRole()],
    education: [blankEducation()],
    skills: [],
    career_objective: '',
    fileUrl: '',
  }
}

function Alert({ type = 'error', children }) {
  if (!children) return null
  const tones = type === 'success'
    ? { bg: palette.goodSoft, fg: palette.good, border: '#b7dec7' }
    : { bg: palette.badSoft, fg: palette.bad, border: '#ebbbbb' }

  return (
    <div style={{
      marginBottom: 16,
      padding: '14px 16px',
      borderRadius: 16,
      background: tones.bg,
      color: tones.fg,
      border: `1px solid ${tones.border}`,
      fontSize: 14,
    }}>
      {children}
    </div>
  )
}

function Pill({ children, tone = 'default' }) {
  const styles = {
    default: { bg: '#efe4d1', color: palette.ink },
    accent: { bg: palette.accentSoft, color: '#7a3718' },
    dark: { bg: palette.ink, color: '#fffaf2' },
    good: { bg: palette.goodSoft, color: palette.good },
  }
  const current = styles[tone] || styles.default
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '6px 10px',
      borderRadius: 999,
      background: current.bg,
      color: current.color,
      fontSize: 12,
      fontWeight: 700,
      marginRight: 8,
      marginBottom: 8,
    }}>
      {children}
    </span>
  )
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 18,
      flexWrap: 'wrap',
    }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 28, color: palette.ink }}>{title}</h2>
        {subtitle && <p style={{ margin: '8px 0 0', color: palette.muted, fontSize: 15 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Metric({ label, value, hint }) {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ fontSize: 13, color: palette.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800, color: palette.ink }}>{value}</div>
      {hint && <div style={{ marginTop: 6, fontSize: 13, color: palette.muted }}>{hint}</div>}
    </div>
  )
}

function ScoreRow({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: palette.muted, marginBottom: 6 }}>
        <span>{label}</span>
        <span>{pct(value)}</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: '#ece1d0', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(0, Math.min(100, Math.round((value || 0) * 100)))}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${palette.accent}, #d08756)`,
        }} />
      </div>
    </div>
  )
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <div style={{ marginBottom: 8, color: palette.muted, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
      {hint && <div style={{ marginTop: 6, color: palette.muted, fontSize: 12 }}>{hint}</div>}
    </label>
  )
}

function Navbar({ user, onLogout }) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backdropFilter: 'blur(14px)',
      borderBottom: `1px solid rgba(213, 198, 175, 0.8)`,
      background: 'rgba(245, 239, 228, 0.82)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '18px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: palette.ink, lineHeight: 1 }}>RecruitSphere</div>
          <div style={{ marginTop: 6, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: palette.muted }}>
            Smart Recruitment Platform
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Pill tone="accent">{user.role === 'hr' ? 'HR Manager' : 'Employee'}</Pill>
          <div style={{ color: palette.ink, fontWeight: 700 }}>{user.name}</div>
          <button style={buttonStyles.secondary} onClick={onLogout}>Logout</button>
        </div>
      </div>
    </div>
  )
}

function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }
    if (mode === 'register' && !form.name.trim()) {
      setError('Name is required.')
      return
    }

    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form
      const data = await apiFetch(path, { method: 'POST', body: payload })
      onAuth(data.user, data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ maxWidth: 1080, width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div style={{
          ...cardStyle,
          padding: 40,
          minHeight: 560,
          background: 'linear-gradient(135deg, #20160f 0%, #5a2f1e 50%, #d59d72 100%)',
          color: '#fff8ef',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8 }}>AI Recruitment</div>
            <h1 style={{ fontSize: 58, lineHeight: 0.95, margin: '18px 0 0' }}>
              Structured profiles, ranked matches, direct interview invites.
            </h1>
            <p style={{ marginTop: 22, fontSize: 18, lineHeight: 1.7, maxWidth: 540 }}>
              A streamlined recruitment platform for efficient hiring.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <Metric label="Profiles" value="Structured" hint="" />
            <Metric label="Topics" value="Organized" hint="" />
            <Metric label="Messages" value="Live" hint="" />
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 34, alignSelf: 'center' }}>
          <SectionTitle
            title={mode === 'login' ? 'Welcome back' : 'Create account'}
            subtitle={mode === 'login' ? 'Sign in to continue.' : 'Choose whether you are an employee or HR manager.'}
          />
          <Alert>{error}</Alert>

          {mode === 'register' && (
            <Field label="Full name">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          )}

          <Field label="Email">
            <input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>

          <Field label="Password">
            <input style={inputStyle} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>

          {mode === 'register' && (
            <Field label="Role">
              <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="employee">Employee / Job Seeker</option>
                <option value="hr">HR Manager</option>
              </select>
            </Field>
          )}

          <button style={{ ...buttonStyles.primary, width: '100%', marginTop: 8 }} onClick={submit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>

          <div style={{ marginTop: 18, fontSize: 14, color: palette.muted }}>
            {mode === 'login' ? 'Need an account?' : 'Already registered?'}{' '}
            <button
              style={{ background: 'none', border: 'none', color: palette.accent, cursor: 'pointer', fontWeight: 700 }}
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'Register here' : 'Login here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmployeeDashboard({ user, token }) {
  const fileRef = useRef(null)
  const [resume, setResume] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [form, setForm] = useState(() => blankProfile(user))
  const [skillDraft, setSkillDraft] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true)
    try {
      const [resumeData, interviewData] = await Promise.all([
        apiFetch('/resume/matches', { token }),
        apiFetch('/interviews/mine', { token }),
      ])
      setResume(resumeData.resume || null)
      setInterviews(interviewData.interviews || [])
      if (resumeData.resume) {
        setForm({
          personalInfo: resumeData.resume.personalInfo || blankProfile(user).personalInfo,
          employmentHistory: resumeData.resume.employmentHistory?.length ? resumeData.resume.employmentHistory : [blankRole()],
          education: resumeData.resume.education?.length ? resumeData.resume.education : [blankEducation()],
          skills: resumeData.resume.skills || [],
          career_objective: resumeData.resume.career_objective || '',
          fileUrl: resumeData.resume.fileUrl || '',
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!token) return undefined
    const interval = setInterval(() => {
      loadData(false)
    }, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  function updatePersonalField(key, value) {
    setForm((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [key]: value },
    }))
  }

  function updateRole(index, key, value) {
    setForm((prev) => ({
      ...prev,
      employmentHistory: prev.employmentHistory.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  function addRole() {
    setForm((prev) => ({
      ...prev,
      employmentHistory: prev.employmentHistory.length >= 4
        ? prev.employmentHistory
        : [...prev.employmentHistory, blankRole()],
    }))
  }

  function removeRole(index) {
    setForm((prev) => ({
      ...prev,
      employmentHistory: prev.employmentHistory.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function updateEducation(index, key, value) {
    setForm((prev) => ({
      ...prev,
      education: prev.education.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  function addEducation() {
    setForm((prev) => ({
      ...prev,
      education: prev.education.length >= 3
        ? prev.education
        : [...prev.education, blankEducation()],
    }))
  }

  function addSkill(rawValue) {
    const value = rawValue.trim().replace(/\s+/g, ' ')
    if (!value) return
    if (form.skills.length >= 20) return
    if (form.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) return
    setForm((prev) => ({ ...prev, skills: [...prev.skills, value] }))
    setSkillDraft('')
  }

  function onSkillKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addSkill(skillDraft.replace(',', ''))
    }
    if (event.key === 'Backspace' && !skillDraft && form.skills.length) {
      setForm((prev) => ({ ...prev, skills: prev.skills.slice(0, -1) }))
    }
  }

  async function uploadVerification(file) {
    if (!file) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const body = new FormData()
      body.append('resume', file)
      const data = await apiFetch('/resume/upload', { method: 'POST', body, token })
      setForm((prev) => ({ ...prev, fileUrl: data.fileUrl }))
      setSuccess('Resume uploaded.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        ...form,
        employmentHistory: form.employmentHistory.slice(0, 4),
        education: form.education.slice(0, 3),
      }
      const data = await apiFetch('/resume/profile', {
        method: 'POST',
        token,
        body: payload,
      })
      setResume(data.resume)
      setForm({
        personalInfo: data.resume.personalInfo,
        employmentHistory: data.resume.employmentHistory?.length ? data.resume.employmentHistory : [blankRole()],
        education: data.resume.education?.length ? data.resume.education : [blankEducation()],
        skills: data.resume.skills || [],
        career_objective: data.resume.career_objective || '',
        fileUrl: data.resume.fileUrl || '',
      })
      setActiveTab('matches')
      setSuccess('Profile saved successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteProfile() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch('/resume', { method: 'DELETE', token })
      setResume(null)
      setForm(blankProfile(user))
      setSkillDraft('')
      setActiveTab('profile')
      setSuccess('Employee profile deleted.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteVerificationCv() {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const data = await apiFetch('/resume/verification-file', { method: 'DELETE', token })
      setResume(data.resume)
      setForm((prev) => ({ ...prev, fileUrl: '' }))
      setSuccess('Uploaded resume removed.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const matches = resume?.matches || []
  const bestMatch = matches[0]

  const stats = useMemo(() => ([
    { label: 'Profile Status', value: resume ? 'Saved' : 'Pending', hint: '' },
    { label: 'Job Matches', value: matches.length, hint: '' },
    { label: 'Top Match', value: bestMatch ? pct(bestMatch.similarity_score) : '--', hint: bestMatch?.title || '' },
    { label: 'Interview Invites', value: interviews.length, hint: '' },
  ]), [resume, matches.length, bestMatch, interviews.length])

  return (
    <DashboardShell
      title="Employee workspace"
      subtitle="Manage your profile and view job opportunities."
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'profile', label: 'Employee Profile' },
        { id: 'matches', label: `Job Matches (${matches.length})` },
        { id: 'interviews', label: `Interview Invites (${interviews.length})` },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 22 }}>
        {stats.map((item) => <Metric key={item.label} {...item} />)}
      </div>

      {loading ? (
        <Panel><div style={{ color: palette.muted }}>Loading your workspace...</div></Panel>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              <Panel>
                <SectionTitle
                  title="Structured employee profile"
                  subtitle="Complete your profile to get started."
                  action={<button style={buttonStyles.accent} onClick={() => setActiveTab('profile')}>Open Profile Form</button>}
                />
              </Panel>

              <Panel>
                <SectionTitle title="Interview updates" subtitle="Check for new messages from HR." />
                {interviews.length === 0 ? (
                  <EmptyState message="No interview invitations yet." />
                ) : (
                  interviews.slice(0, 2).map((interview) => (
                    <div key={interview.id} style={{ ...innerCardStyle, marginBottom: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: palette.ink }}>{interview.title}</div>
                      <div style={{ marginTop: 6, color: palette.muted }}>{interview.hr?.name || 'HR'} | {interview.job?.title || 'Job'}</div>
                      <p style={{ margin: '10px 0 0', color: palette.ink, lineHeight: 1.7 }}>{interview.message}</p>
                    </div>
                  ))
                )}
              </Panel>
            </div>
          )}

          {activeTab === 'profile' && (
            <EmployeeProfileForm
              form={form}
              skillDraft={skillDraft}
              resume={resume}
              busy={busy}
              onPersonalChange={updatePersonalField}
              onRoleChange={updateRole}
              onAddRole={addRole}
              onRemoveRole={removeRole}
              onEducationChange={updateEducation}
              onAddEducation={addEducation}
              onSkillDraftChange={setSkillDraft}
              onSkillKeyDown={onSkillKeyDown}
              onRemoveSkill={(skill) => setForm((prev) => ({ ...prev, skills: prev.skills.filter((item) => item !== skill) }))}
              onObjectiveChange={(value) => setForm((prev) => ({ ...prev, career_objective: value.slice(0, 500) }))}
              onUploadVerification={(file) => uploadVerification(file)}
              onSave={saveProfile}
              onDelete={deleteProfile}
              onDeleteVerificationCv={deleteVerificationCv}
              fileRef={fileRef}
            />
          )}

          {activeTab === 'matches' && (
            <Panel>
              <SectionTitle title="Job matches" subtitle="View available job opportunities." />
              {!resume ? (
                <EmptyState message="Save your employee profile to generate job matches." />
              ) : matches.length === 0 ? (
                <EmptyState message="No jobs available yet." />
              ) : (
                matches.map((match, index) => (
                  <div key={`${match.jobId}-${index}`} style={{ ...innerCardStyle, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: palette.muted, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rank #{index + 1}</div>
                        <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: palette.ink }}>{match.title}</div>
                      </div>
                      <Pill tone="dark">Match: {pct(match.similarity_score)}</Pill>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <Pill tone="accent">Domain: {match.domain || 'General'}</Pill>
                    </div>
                    {!!match.matched_skills?.length && (
                      <div style={{ marginTop: 12 }}>
                        {match.matched_skills.map((skill) => <Pill key={skill} tone="good">Matched: {skill}</Pill>)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </Panel>
          )}

          {activeTab === 'interviews' && (
            <Panel>
              <SectionTitle title="Interview invitations" subtitle="Messages from HR managers appear here." />
              {interviews.length === 0 ? (
                <EmptyState message="No interview invitations yet." />
              ) : (
                interviews.map((interview) => (
                  <div key={interview.id} style={{ ...innerCardStyle, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: palette.ink }}>{interview.title}</div>
                        <div style={{ marginTop: 6, color: palette.muted }}>
                          Job: {interview.job?.title || 'Unknown'} | HR: {interview.hr?.name || 'Unknown'}
                        </div>
                      </div>
                      <Pill tone="good">{new Date(interview.sentAt).toLocaleDateString()}</Pill>
                    </div>
                    <p style={{ margin: '12px 0 0', color: palette.ink, lineHeight: 1.7 }}>{interview.message}</p>
                    <div style={{ marginTop: 12 }}>
                      {interview.interviewDate && <Pill>Interview Date: {interview.interviewDate}</Pill>}
                      {interview.interviewMode && <Pill>Mode: {interview.interviewMode}</Pill>}
                      {interview.interviewLocation && <Pill>Location: {interview.interviewLocation}</Pill>}
                    </div>
                  </div>
                ))
              )}
            </Panel>
          )}
        </>
      )}
    </DashboardShell>
  )
}

function EmployeeProfileForm({
  form,
  skillDraft,
  resume,
  busy,
  onPersonalChange,
  onRoleChange,
  onAddRole,
  onRemoveRole,
  onEducationChange,
  onAddEducation,
  onSkillDraftChange,
  onSkillKeyDown,
  onRemoveSkill,
  onObjectiveChange,
  onUploadVerification,
  onSave,
  onDelete,
  onDeleteVerificationCv,
  fileRef,
}) {
  return (
    <Panel>
      <SectionTitle title="Employee profile form" subtitle="This form replaces PDF extraction for matching." />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <Field label="Full Name">
          <input style={inputStyle} value={form.personalInfo.full_name} onChange={(e) => onPersonalChange('full_name', e.target.value)} />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.personalInfo.email} onChange={(e) => onPersonalChange('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} value={form.personalInfo.phone} onChange={(e) => onPersonalChange('phone', e.target.value)} />
        </Field>
        <Field label="City">
          <input style={inputStyle} value={form.personalInfo.city} onChange={(e) => onPersonalChange('city', e.target.value)} />
        </Field>
      </div>

      <SectionTitle
        title="Employment history / internship"
        subtitle="Up to 4 entries."
        action={<button style={buttonStyles.secondary} onClick={onAddRole} disabled={form.employmentHistory.length >= 4}>Add Another Role</button>}
      />
      {form.employmentHistory.map((role, index) => (
        <div key={index} style={{ ...innerCardStyle, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18, color: palette.ink }}>Role {index + 1}</h3>
            {form.employmentHistory.length > 1 && (
              <button style={buttonStyles.secondary} onClick={() => onRemoveRole(index)}>Remove</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Field label="Company Name">
              <input style={inputStyle} value={role.company_name} onChange={(e) => onRoleChange(index, 'company_name', e.target.value)} />
            </Field>
            <Field label="Job Title">
              <input style={inputStyle} value={role.job_title} onChange={(e) => onRoleChange(index, 'job_title', e.target.value)} />
            </Field>
            <Field label="Start Date">
              <input style={inputStyle} value={role.start_date} onChange={(e) => onRoleChange(index, 'start_date', e.target.value)} />
            </Field>
            <Field label="End Date">
              <input style={inputStyle} value={role.end_date} onChange={(e) => onRoleChange(index, 'end_date', e.target.value)} />
            </Field>
          </div>
          <Field label="Key Duties">
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={role.key_duties}
              onChange={(e) => onRoleChange(index, 'key_duties', e.target.value)}
            />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: palette.muted }}>
            <input
              type="checkbox"
              checked={role.is_present}
              onChange={(e) => onRoleChange(index, 'is_present', e.target.checked)}
            />
            Currently working here
          </label>
        </div>
      ))}

      <SectionTitle
        title="Education"
        subtitle="Up to 3 entries."
        action={<button style={buttonStyles.secondary} onClick={onAddEducation} disabled={form.education.length >= 3}>Add Education</button>}
      />
      {form.education.map((edu, index) => (
        <div key={index} style={{ ...innerCardStyle, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Field label="Institution Name">
              <input style={inputStyle} value={edu.institution_name} onChange={(e) => onEducationChange(index, 'institution_name', e.target.value)} />
            </Field>
            <Field label="Degree">
              <input style={inputStyle} value={edu.degree} onChange={(e) => onEducationChange(index, 'degree', e.target.value)} />
            </Field>
            <Field label="Year Completed">
              <input style={inputStyle} value={edu.year_completed} onChange={(e) => onEducationChange(index, 'year_completed', e.target.value)} />
            </Field>
            <Field label="CGPA">
              <input style={inputStyle} value={edu.cgpa} onChange={(e) => onEducationChange(index, 'cgpa', e.target.value)} />
            </Field>
          </div>
        </div>
      ))}

      <Field label="Skills">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {form.skills.map((skill) => (
            <Pill key={skill} tone="good">
              {skill}
              <button
                style={{ marginLeft: 6, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 12 }}
                onClick={() => onRemoveSkill(skill)}
              >
                ×
              </button>
            </Pill>
          ))}
        </div>
        <input
          style={inputStyle}
          value={skillDraft}
          onChange={(e) => onSkillDraftChange(e.target.value)}
          onKeyDown={onSkillKeyDown}
          placeholder="Type skills and press Enter or comma to add"
        />
      </Field>

      <Field label="Career Objective">
        <textarea
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
          value={form.career_objective}
          onChange={(e) => onObjectiveChange(e.target.value)}
          maxLength={500}
        />
      </Field>

      <Field label="Upload Resume (Optional)">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => onUploadVerification(e.target.files[0])}
          style={{ marginBottom: 8 }}
        />
        {form.fileUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href={`${SERVER_ORIGIN}${form.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: palette.accent }}>
              View uploaded resume
            </a>
            <button style={buttonStyles.secondary} onClick={onDeleteVerificationCv}>Remove</button>
          </div>
        )}
      </Field>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button style={buttonStyles.primary} onClick={onSave} disabled={busy}>
          {busy ? 'Saving...' : 'Save Profile'}
        </button>
        {resume && (
          <button style={buttonStyles.secondary} onClick={onDelete} disabled={busy}>
            Delete Profile
          </button>
        )}
      </div>
    </Panel>
  )
}

function HRDashboard({ token }) {
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [form, setForm] = useState({ title: '', description: '' })
  const [interviewForms, setInterviewForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadJobs() {
    setLoading(true)
    try {
      const data = await apiFetch('/jobs', { token })
      setJobs(data.jobs || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openJob(jobId) {
    setError('')
    try {
      const data = await apiFetch(`/jobs/${jobId}/applicants`, { token })
      setSelectedJob({ ...data.job, ranked: data.ranked })
      setActiveTab('applicants')
    } catch (err) {
      setError(err.message)
    }
  }

  async function postJob() {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const data = await apiFetch('/jobs', { method: 'POST', token, body: form })
      setJobs((prev) => [data.job, ...prev])
      setForm({ title: '', description: '' })
      setSuccess('Job posted successfully.')
      setActiveTab('jobs')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function setInterviewDraft(resumeId, key, value) {
    setInterviewForms((prev) => ({
      ...prev,
      [resumeId]: {
        title: 'Interview Invitation',
        message: 'Your profile is shortlisted. We would like to schedule an interview with you.',
        interviewDate: '',
        interviewMode: '',
        interviewLocation: '',
        ...(prev[resumeId] || {}),
        [key]: value,
      },
    }))
  }

  async function sendInterview(applicant) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const draft = interviewForms[applicant.resume.id] || {
        title: `Interview for ${selectedJob.title}`,
        message: `We liked your profile and would like to schedule an interview for the ${selectedJob.title} role.`,
        interviewDate: '',
        interviewMode: '',
        interviewLocation: '',
      }
      const data = await apiFetch('/interviews', {
        method: 'POST',
        token,
        body: {
          jobId: selectedJob._id,
          resumeId: applicant.resume.id,
          ...draft,
        },
      })
      setSelectedJob((prev) => ({
        ...prev,
        ranked: prev.ranked.map((item) => item.resume?.id === applicant.resume.id ? { ...item, interview: data.interview } : item),
      }))
      setSuccess(`Interview invitation sent.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function deleteJob(jobId) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch(`/jobs/${jobId}`, { method: 'DELETE', token })
      setJobs((prev) => prev.filter((job) => job._id !== jobId))
      setSelectedJob((prev) => prev && prev._id === jobId ? null : prev)
      setActiveTab('jobs')
      setSuccess('Job deleted successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const totalApplicants = jobs.reduce((sum, job) => sum + (job.ranked?.length || 0), 0)
  const strongestMatch = jobs.flatMap((job) => job.ranked || []).sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))[0]

  return (
    <DashboardShell
      title="HR manager workspace"
      subtitle="Manage job postings and review applicants."
      tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'jobs', label: `Jobs (${jobs.length})` },
        { id: 'applicants', label: 'Applicants' },
        { id: 'post', label: 'Post Job' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 22 }}>
        <Metric label="Job Postings" value={jobs.length} hint="" />
        <Metric label="Applicants Ranked" value={totalApplicants} hint="" />
        <Metric label="Best Match" value={strongestMatch ? pct(strongestMatch.similarity_score) : '--'} hint={strongestMatch?.name || ''} />
        <Metric label="Interviews" value="Direct" hint="" />
      </div>

      {loading ? (
        <Panel><div style={{ color: palette.muted }}>Loading HR data...</div></Panel>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              <Panel>
                <SectionTitle
                  title="Job management"
                  subtitle="Create and manage job opportunities."
                  action={<button style={buttonStyles.accent} onClick={() => setActiveTab('post')}>Post a new job</button>}
                />
              </Panel>
              <Panel>
                <SectionTitle title="Recent jobs" subtitle="View and manage your job postings." />
                {jobs.length === 0 ? (
                  <EmptyState message="No jobs posted yet." />
                ) : (
                  jobs.slice(0, 4).map((job) => (
                    <JobSummaryCard key={job._id} job={job} onOpen={() => openJob(job._id)} onDelete={() => deleteJob(job._id)} />
                  ))
                )}
              </Panel>
            </div>
          )}

          {activeTab === 'jobs' && (
            <Panel>
              <SectionTitle title="Job postings" subtitle="Manage your active job listings." />
              {jobs.length === 0 ? (
                <EmptyState message="No jobs posted yet." />
              ) : (
                jobs.map((job) => <JobSummaryCard key={job._id} job={job} onOpen={() => openJob(job._id)} onDelete={() => deleteJob(job._id)} expanded />)
              )}
            </Panel>
          )}

          {activeTab === 'post' && (
            <Panel>
              <SectionTitle title="Post a job" subtitle="Add a new job opportunity." />
              <Field label="Job title">
                <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Job description">
                <textarea
                  style={{ ...inputStyle, minHeight: 180, resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <button style={buttonStyles.primary} onClick={postJob} disabled={busy}>
                {busy ? 'Posting job...' : 'Post Job'}
              </button>
            </Panel>
          )}

          {activeTab === 'applicants' && (
            <Panel>
              {!selectedJob ? (
                <EmptyState message="Open a job posting to inspect ranked applicants." />
              ) : (
                <>
                  <SectionTitle
                    title={selectedJob.title}
                    subtitle={selectedJob.description}
                    action={
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button style={buttonStyles.secondary} onClick={() => openJob(selectedJob._id)}>Refresh</button>
                        <button style={buttonStyles.secondary} onClick={() => deleteJob(selectedJob._id)} disabled={busy}>Delete Job</button>
                      </div>
                    }
                  />
                  <div style={{ marginBottom: 14 }}>
                    <Pill tone="accent">Domain: {selectedJob.domain || 'General'}</Pill>
                  </div>
                  {selectedJob.ranked?.length ? selectedJob.ranked.map((applicant, index) => (
                    <ApplicantCard
                      key={applicant.resume?.id || index}
                      applicant={applicant}
                      index={index}
                      busy={busy}
                      onChangeInterviewField={setInterviewDraft}
                      interviewDraft={interviewForms[applicant.resume?.id] || {}}
                      onSendInterview={() => sendInterview(applicant)}
                    />
                  )) : <EmptyState message="No employee profiles available yet." />}
                </>
              )}
            </Panel>
          )}
        </>
      )}
    </DashboardShell>
  )
}

function JobSummaryCard({ job, onOpen, onDelete, expanded = false }) {
  return (
    <div style={{ ...innerCardStyle, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: palette.ink }}>{job.title}</div>
          <div style={{ marginTop: 6, color: palette.muted }}>
            {(job.ranked || []).length} applicants ranked | {new Date(job.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={buttonStyles.secondary} onClick={onOpen}>View Applicants</button>
          <button style={buttonStyles.secondary} onClick={onDelete}>Delete Job</button>
        </div>
      </div>
      {expanded && (
        <p style={{ margin: '12px 0 0', lineHeight: 1.7, color: palette.ink }}>
          {job.description}
        </p>
      )}
      {job.ranked?.[0] && (
        <div style={{ marginTop: 12 }}>
          <Pill tone="good">Top applicant: {job.ranked[0].name}</Pill>
          <Pill tone="dark">{pct(job.ranked[0].similarity_score)}</Pill>
        </div>
      )}
    </div>
  )
}

function ApplicantCard({ applicant, index, busy, onChangeInterviewField, interviewDraft, onSendInterview }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ ...innerCardStyle, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: palette.muted, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Rank #{index + 1}</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: palette.ink }}>{applicant.name}</div>
        </div>
        <Pill tone="dark">Match: {pct(applicant.similarity_score)}</Pill>
      </div>
      <div style={{ marginTop: 10 }}>
        <Pill tone="accent">Domain: {applicant.domain || 'General'}</Pill>
      </div>
      {!!applicant.matched_skills?.length && (
        <div style={{ marginTop: 12 }}>
          {applicant.matched_skills.map((skill) => <Pill key={skill} tone="good">Matched: {skill}</Pill>)}
        </div>
      )}
      {applicant.resume?.fileUrl && (
        <div style={{ marginTop: 12 }}>
          <a href={`${SERVER_ORIGIN}${applicant.resume.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: palette.accent }}>
            View uploaded resume
          </a>
        </div>
      )}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={buttonStyles.secondary} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
        <button style={buttonStyles.accent} onClick={onSendInterview} disabled={busy}>
          Send Interview Invite
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: 16 }}>
          <Field label="Interview Title">
            <input
              style={inputStyle}
              value={interviewDraft.title || ''}
              onChange={(e) => onChangeInterviewField(applicant.resume.id, 'title', e.target.value)}
            />
          </Field>
          <Field label="Message">
            <textarea
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
              value={interviewDraft.message || ''}
              onChange={(e) => onChangeInterviewField(applicant.resume.id, 'message', e.target.value)}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Field label="Interview Date">
              <input
                style={inputStyle}
                type="date"
                value={interviewDraft.interviewDate || ''}
                onChange={(e) => onChangeInterviewField(applicant.resume.id, 'interviewDate', e.target.value)}
              />
            </Field>
            <Field label="Interview Mode">
              <select
                style={inputStyle}
                value={interviewDraft.interviewMode || ''}
                onChange={(e) => onChangeInterviewField(applicant.resume.id, 'interviewMode', e.target.value)}
              >
                <option value="">Select mode</option>
                <option value="In-person">In-person</option>
                <option value="Virtual">Virtual</option>
                <option value="Phone">Phone</option>
              </select>
            </Field>
            <Field label="Interview Location">
              <input
                style={inputStyle}
                value={interviewDraft.interviewLocation || ''}
                onChange={(e) => onChangeInterviewField(applicant.resume.id, 'interviewLocation', e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardShell({ title, subtitle, tabs, activeTab, onTabChange, children }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 36, color: palette.ink }}>{title}</h1>
        {subtitle && <p style={{ margin: '8px 0 0', color: palette.muted, fontSize: 18 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...buttonStyles.secondary,
              background: activeTab === tab.id ? palette.ink : 'transparent',
              color: activeTab === tab.id ? '#fffaf2' : palette.ink,
            }}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}

function Panel({ children }) {
  return (
    <div style={cardStyle}>
      {children}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: palette.muted }}>
      {message}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')

  function handleAuth(nextUser, nextToken) {
    localStorage.setItem('user', JSON.stringify(nextUser))
    localStorage.setItem('token', nextToken)
    setUser(nextUser)
    setToken(nextToken)
  }

  function handleLogout() {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    setToken('')
  }

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, color: palette.ink }}>
      {!user ? (
        <AuthPage onAuth={handleAuth} />
      ) : (
        <>
          <Navbar user={user} onLogout={handleLogout} />
          {user.role === 'hr'
            ? <HRDashboard token={token} />
            : <EmployeeDashboard user={user} token={token} />}
        </>
      )}
    </div>
  )
}