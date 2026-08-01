// Enforce specific roles on a route. Must run after authMiddleware.
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient role.' });
  }
  next();
};

module.exports = requireRole;
