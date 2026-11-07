import { prisma } from "../config/prisma.ts";
import type { Papel } from "../generated/prisma/enums.ts";

export const usuarioRepository = {
  criar(dados: { nome: string; email: string; senhaHash: string; papel: Papel }) {
    return prisma.usuario.create({ data: dados });
  },

  buscarPorEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  buscarPorId(id: number) {
    return prisma.usuario.findUnique({ where: { id } });
  },

  /** Lista usuários sem `senhaHash`, para a tela de gerência. */
  listar() {
    return prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
    });
  },
};
