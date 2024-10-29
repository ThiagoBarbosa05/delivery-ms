import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../env";

interface DecodedToken extends JwtPayload {
  userName: string;
  role: string;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const accessToken = req.headers.authorization?.split("Bearer ")[1];

    if (!accessToken) {
      return res
        .status(403)
        .json({ message: "Token de acesso não fornecido." });
    }

    const decodedToken = jwt.verify(
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      accessToken!,
      Buffer.from(env.JWT_PUBLIC_KEY, "base64").toString("utf-8"),
      { algorithms: ["RS256"] }
    ) as DecodedToken;

    req.user = {
      id: decodedToken.sub ?? "",
      name: decodedToken.userName,
      role: decodedToken.role,
    };

    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "Sem permissão para realizar essa operação." });
    }

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).send({ message: "Token expirado" });
    }
    return res.status(401).send({ message: "Token inválido" });
  }
}
