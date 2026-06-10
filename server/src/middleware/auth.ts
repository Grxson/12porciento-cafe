import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  admin?: { id: string; email: string; name: string };
}

export interface AnyAuthRequest extends Request {
  admin?: { id: string; email: string; name: string };
  user?: { id: string; email: string; name: string; role: string };
}

export const requireAnyAuth = (req: AnyAuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'No autorizado' }); return; }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string; email: string; name: string; role?: string;
    };
    if (payload.role === 'USER') {
      (req as AnyAuthRequest).user = payload as { id: string; email: string; name: string; role: string };
    } else {
      (req as AnyAuthRequest).admin = payload;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      name: string;
      role?: string;
    };
    if (payload.role === 'USER') {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
