import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, prisma, registerUser, resetDatabase } from '../helpers.js';

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

const refresh = (cookie?: string) => {
  const req = request(app).post('/api/auth/refresh').set('X-Requested-With', 'Rotulai');
  return cookie ? req.set('Cookie', cookie) : req;
};

describe('autenticação', () => {
  it('cadastra usuário, armazena apenas o hash e envia refresh token em cookie httpOnly', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ANA@Exemplo.dev ', password: 'SenhaForte1' })
      .expect(201);

    expect(response.body.user).toMatchObject({ name: 'Ana', email: 'ana@exemplo.dev', role: 'FREE' });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(typeof response.body.accessToken).toBe('string');

    const cookie = (response.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toMatch(/^rotulai_rt=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.dev' } });
    expect(stored.passwordHash).not.toContain('SenhaForte1');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    const token = await prisma.refreshToken.findFirstOrThrow({ where: { userId: stored.id } });
    expect(cookie).not.toContain(token.tokenHash);
  });

  it('rejeita senha fraca e e-mail duplicado', async () => {
    const weak = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@exemplo.dev', password: 'somenteletras' })
      .expect(400);
    expect(weak.body.error.details[0].field).toBe('password');

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@exemplo.dev', password: 'SenhaForte1' })
      .expect(201);
    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Outra', email: 'ana@exemplo.dev', password: 'SenhaForte1' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('usa a mesma mensagem para e-mail inexistente e senha incorreta', async () => {
    const user = await registerUser(app);
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Errada123' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@exemplo.dev', password: 'Errada123' })
      .expect(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('protege rotas privadas e rejeita tokens inválidos', async () => {
    await request(app).get('/api/products').expect(401);
    await request(app).get('/api/products').set('Authorization', 'Bearer token-invalido').expect(401);
    const user = await registerUser(app);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${user.token}`).expect(200);
    expect(me.body.user.email).toBe(user.email);
  });

  it('exige o cabeçalho anti-CSRF no refresh', async () => {
    const user = await registerUser(app);
    await request(app).post('/api/auth/refresh').set('Cookie', user.cookie).expect(401);
  });

  it('rotaciona o refresh token e revoga a família quando um token antigo é reutilizado', async () => {
    const user = await registerUser(app);

    const first = await refresh(user.cookie).expect(200);
    const rotatedCookie = (first.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    expect(rotatedCookie).not.toBe(user.cookie);

    // Reuso do token original (possível roubo): deve falhar e invalidar também o token novo.
    await refresh(user.cookie).expect(401);
    await refresh(rotatedCookie).expect(401);
  });

  it('logout revoga a sessão', async () => {
    const user = await registerUser(app);
    await request(app)
      .post('/api/auth/logout')
      .set('X-Requested-With', 'Rotulai')
      .set('Cookie', user.cookie)
      .expect(204);
    await refresh(user.cookie).expect(401);
  });

  it('exclui a conta e todos os dados em cascata mediante senha', async () => {
    const user = await registerUser(app);
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Produto', brand: 'Marca', category: 'OUTRO', ingredients: ['Aqua'] })
      .expect(201);

    await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ password: 'errada' })
      .expect(403);
    await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ password: user.password })
      .expect(204);

    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    expect(await prisma.product.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
  });
});
