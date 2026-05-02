// Usage: requireRole('hr') or requireRole('employee')
const role = (requiredRole) => (req, res, next) => {
  if (req.user.role !== requiredRole)
    return res.status(403).json({ message: `Access denied — ${requiredRole} only` })
  next()
}

export default role