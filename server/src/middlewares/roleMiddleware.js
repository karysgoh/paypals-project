const verifyRole = (allowedRoleNames) => {
  return (req, res, next) => {
    const roleName = res.locals.role_name; 
    
    if (!roleName) {
      return res.status(403).json({
        message: 'Role not found in token',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    if (!allowedRoleNames.includes(roleName)) {
      return res.status(403).json({
        message: 'You do not have the required permissions for this action',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoleNames,
        current: roleName
      });
    }

    next();
  };
};

// Helper function to check if user has admin role
const isAdmin = (req, res, next) => {
  const roleName = res.locals.role_name;
  
  if (roleName === 'admin') {
    next();
  } else {
    return res.status(403).json({
      message: 'Admin privileges required',
      error: 'ADMIN_REQUIRED'
    });
  }
};

// Helper function to check if user has any role
const hasRole = (req, res, next) => {
  const roleName = res.locals.role_name;
  
  if (roleName) {
    next();
  } else {
    return res.status(403).json({
      message: 'Role verification required',
      error: 'ROLE_REQUIRED'
    });
  }
};

module.exports = {
  verifyRole,
  isAdmin,
  hasRole
};