import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Skill catalogue and assessment pagination', () => {
  let app: ReturnType<typeof buildApp>;
  beforeEach(async () => { await cleanDatabase(); app = buildApp(); await app.ready(); });
  afterEach(async () => { await app.close(); await cleanDatabase(); });
  async function create(name: string) {
    const response = await app.inject({method: 'POST', url: '/api/v1/skills', payload: {name, category: 'Tools'}});
    expect(response.statusCode).toBe(201);
    return response.json().id as number;
  }
  it('filters before pagination and reports matching totals', async () => {
    for (let i=0;i<13;i++) await create(`TypeScript ${String(i).padStart(2,'0')}`);
    await create('PostgreSQL');
    const first = await app.inject({method: 'GET', url: '/api/v1/skills?search=TYPEscript&page=1&pageSize=10'});
    expect(first.statusCode).toBe(200);
    expect(first.json().pagination).toEqual({page:1,pageSize:10,totalItems:13,totalPages:2});
    expect(first.json().data).toHaveLength(10);
    const last = await app.inject({method: 'GET', url: '/api/v1/skills?search=typeSCRIPT&page=90&pageSize=10'});
    expect(last.json().pagination.page).toBe(2);
    expect(last.json().data).toHaveLength(3);
    const none = await app.inject({method:'GET',url:'/api/v1/skills?search=nothing&page=4&pageSize=25'});
    expect(none.json().pagination).toMatchObject({page:1,totalItems:0,totalPages:0});
    expect(none.json().data).toEqual([]);
  });
  it('preserves stable sorting and rejects unsupported page sizes and sorting', async () => {
    await create('Beta'); await create('Alpha');
    const response = await app.inject({method:'GET',url:'/api/v1/skills?page=1&pageSize=10&sortBy=category&sortOrder=desc'});
    expect(response.json().data.map((s:{name:string})=>s.name)).toEqual(['Alpha','Beta']);
    expect((await app.inject({method:'GET',url:'/api/v1/skills?page=1&pageSize=11'})).statusCode).toBe(400);
    expect((await app.inject({method:'GET',url:'/api/v1/skills?page=1&sortBy=unknown'})).statusCode).toBe(400);
  });
  it('includes unassessed skills and persists updates across pages', async () => {
    const ids = [];
    for (let i=0;i<12;i++) ids.push(await create(`Skill ${String(i).padStart(2,'0')}`));
    const first = await app.inject({method:'GET',url:'/api/v1/user-skills/catalogue?page=1&pageSize=10'});
    expect(first.json().pagination.totalItems).toBe(12);
    expect(first.json().data[0].level).toBeNull();
    const saved = await app.inject({method:'PUT',url:`/api/v1/user-skills/${ids[10]}`,payload:{level:4}});
    expect(saved.statusCode).toBe(200);
    const page2 = await app.inject({method:'GET',url:'/api/v1/user-skills/catalogue?page=2&pageSize=10'});
    expect(page2.json().data[0].level).toBe(4);
    await app.inject({method:'DELETE',url:`/api/v1/user-skills/${ids[10]}`});
    const refreshed = await app.inject({method:'GET',url:'/api/v1/user-skills/catalogue?page=2&pageSize=10'});
    expect(refreshed.json().data[0].level).toBeNull();
  });
});
