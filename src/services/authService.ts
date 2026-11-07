import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";
import { usuarioRepository } from "../repositories/usuarioRepository.ts";
import { AppError } from "../utils/AppError.ts";
import { Papel } from "../generated/prisma/enums.ts";

function gerarToken(usuario: { id: number; papel: Papel }) {
  return jwt.sign({ id: usuario.id, papel: usuario.papel }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
}

export const authService = {
  // Cadastro público: sempre cria CLIENTE. Criar um OPERADOR exige estar
  // autenticado como OPERADOR — ver `usuarioService.criar`.
  async registrar(dados: { nome: string; email: string; senha: string }) {
    const existente = await usuarioRepository.buscarPorEmail(dados.email);
    if (existente) {
      throw new AppError("Já existe um usuário cadastrado com este e-mail", 409);
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);
    const usuario = await usuarioRepository.criar({
      nome: dados.nome,
      email: dados.email,
      senhaHash,
      papel: Papel.CLIENTE,
    });

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      token: gerarToken(usuario),
    };
  },

  async obterPerfil(id: number) {
    const usuario = await usuarioRepository.buscarPorId(id);
    if (!usuario) throw new AppError("Usuário não encontrado", 404);
    return { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel };
  },

  async login(email: string, senha: string) {
    const usuario = await usuarioRepository.buscarPorEmail(email);
    if (!usuario) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      token: gerarToken(usuario),
    };
  },
};
