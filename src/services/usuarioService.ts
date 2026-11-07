import bcrypt from "bcryptjs";
import { usuarioRepository } from "../repositories/usuarioRepository.ts";
import { AppError } from "../utils/AppError.ts";
import type { Papel } from "../generated/prisma/enums.ts";

export const usuarioService = {
  listar() {
    return usuarioRepository.listar();
  },

  /** Cadastro de usuário pela gerência: só acessível a um OPERADOR autenticado. */
  async criar(dados: { nome: string; email: string; senha: string; papel: Papel }) {
    const existente = await usuarioRepository.buscarPorEmail(dados.email);
    if (existente) {
      throw new AppError("Já existe um usuário cadastrado com este e-mail", 409);
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);
    const usuario = await usuarioRepository.criar({
      nome: dados.nome,
      email: dados.email,
      senhaHash,
      papel: dados.papel,
    });

    return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
  },
};
