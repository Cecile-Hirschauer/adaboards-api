import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import './setup';
import { prisma } from './helpers';

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'Password123!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 409 if email already exists', async () => {
      // Créer un utilisateur
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          name: 'First User',
          password: 'Password123!'
        });

      // Essayer de créer le même utilisateur
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          name: 'Second User',
          password: 'Password123!'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com'
          // name et password manquants
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Créer un utilisateur
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          name: 'Login User',
          password: 'Password123!'
        });

      // Se connecter
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 with invalid credentials', async () => {
      // Créer un utilisateur
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'wrongpass@example.com',
          name: 'User',
          password: 'Password123!'
        });

      // Essayer de se connecter avec un mauvais mot de passe
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 if user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/search (protected route)', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/users/search');

      expect(response.status).toBe(401);
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(403);
    });

    it('should allow access with valid token', async () => {
      // Créer et se connecter
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'search@example.com',
          name: 'Search User',
          password: 'Password123!'
        });

      const token = registerResponse.body.token;

      // Accéder à une route protégée
      const response = await request(app)
        .get('/api/users/search?query=test')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });
});
