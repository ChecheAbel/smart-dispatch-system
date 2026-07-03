import type { TokenType } from "../db/types";
import { prisma } from "../db/prisma";

export async function createToken(
  userId: string,
  tokenHash: string,
  type: TokenType,
  expiresAt: Date,
) {
  return prisma.token.create({
    data: { userId, tokenHash, type, expiresAt },
  });
}

export async function findValidTokenByHash(tokenHash: string, type: TokenType) {
  return prisma.token.findFirst({
    where: {
      tokenHash,
      type,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function revokeToken(id: string) {
  await prisma.token.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserTokensByType(userId: string, type: TokenType) {
  await prisma.token.updateMany({
    where: { userId, type, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
