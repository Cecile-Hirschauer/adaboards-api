import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma';
import { RegisterDTO, LoginDTO, AuthResponse, JWTPayload } from '../types/auth.types';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword
      }
    });

    // Générer le token JWT
    const token = this.generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Générer le token JWT
    const token = this.generateToken({
      userId: user.id,
      email: user.email
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export const authService = new AuthService();
