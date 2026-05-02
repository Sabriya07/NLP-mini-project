import jwt from 'jsonwebtoken'

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]  // Bearer <token>
  if (!token) return res.status(401).json({ message: 'No token provided' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)   // { id, role }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}

export default auth