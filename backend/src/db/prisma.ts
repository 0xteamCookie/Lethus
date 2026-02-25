import { config } from "../config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
})

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({adapter:adapter});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
