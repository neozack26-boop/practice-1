import { supabaseAdmin, createUserClient } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or malformed Bearer token'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token is empty' });
    }

    // Verify token with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired token',
        details: error?.message
      });
    }

    // Attach user and user-scoped Supabase client that forwards the JWT
    // All queries made with req.supabase will strictly enforce RLS policies
    req.user = data.user;
    req.token = token;
    req.supabase = createUserClient(token);

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

