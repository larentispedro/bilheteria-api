import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { env } from "./env.ts";

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = new PrismaClient({ adapter });

/** Cliente Prisma "normal" ou cliente de uma transação interativa. */
export type DB = typeof prisma | Prisma.TransactionClient;
