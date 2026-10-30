import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET as getSubscriptionsCron } from './subscriptions/route';
import { GET as getDailyReportCron } from './daily-report/route';

describe('Cron Routes Authorization (Fail-Closed)', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'super_secure_cron_secret_12345';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('deve retornar 401 para /api/cron/subscriptions sem cabeçalho Authorization', async () => {
    const req = new Request('http://localhost:3000/api/cron/subscriptions');
    const res = await getSubscriptionsCron(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('deve retornar 401 para /api/cron/subscriptions com token incorreto', async () => {
    const req = new Request('http://localhost:3000/api/cron/subscriptions', {
      headers: { authorization: 'Bearer wrong_token' },
    });
    const res = await getSubscriptionsCron(req);
    expect(res.status).toBe(401);
  });

  it('deve retornar 401 para /api/cron/subscriptions se CRON_SECRET não estiver configurado', async () => {
    delete process.env.CRON_SECRET;
    const req = new Request('http://localhost:3000/api/cron/subscriptions', {
      headers: { authorization: 'Bearer super_secure_cron_secret_12345' },
    });
    const res = await getSubscriptionsCron(req);
    expect(res.status).toBe(401);
  });

  it('deve retornar 401 para /api/cron/daily-report sem cabeçalho Authorization', async () => {
    const req = new Request('http://localhost:3000/api/cron/daily-report');
    const res = await getDailyReportCron(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('deve retornar 401 para /api/cron/daily-report com token incorreto', async () => {
    const req = new Request('http://localhost:3000/api/cron/daily-report', {
      headers: { authorization: 'Bearer wrong_token' },
    });
    const res = await getDailyReportCron(req);
    expect(res.status).toBe(401);
  });

  it('deve retornar 401 para /api/cron/daily-report se CRON_SECRET for indefinido', async () => {
    delete process.env.CRON_SECRET;
    const req = new Request('http://localhost:3000/api/cron/daily-report', {
      headers: { authorization: 'Bearer super_secure_cron_secret_12345' },
    });
    const res = await getDailyReportCron(req);
    expect(res.status).toBe(401);
  });
});
