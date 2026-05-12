const authorize = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ message: 'Error en autorización' });
    }
  };
};

module.exports = authorize;
