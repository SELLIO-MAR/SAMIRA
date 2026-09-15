import { PrismaClient } from "@prisma/client";

// Instance unique du client Prisma, réutilisée dans toute l'application
// (évite d'épuiser le pool de connexions PostgreSQL en développement avec tsx watch).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
