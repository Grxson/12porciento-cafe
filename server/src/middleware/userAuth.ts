import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface UserAuthRequest extends Request {
  user?: { id: string; email: string; name: string; role: string };
}

export const requireUserAuth = (
  req: UserAuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    if (payload.role !== "USER") {
      res.status(403).json({ error: "Acceso denegado" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};
