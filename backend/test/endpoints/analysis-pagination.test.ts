import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';
import { cleanDatabase } from '../helpers/database';

describe('Analysis pagination invariants', () => {
  let app: ReturnType<typeof buildApp>;
  beforeEach(async () => { await cleanDatabase(); app = buildApp(); await app.ready(); });
  afterEach(async () => { await app.close(); await cleanDatabase(); });
  it('keeps calculated statistics and missingInformation unchanged when filtering', async () => {
    const created = await app.inject({method:'POST',url:'/api/v1/jobs',payload:{
      dateFound:'2026-10-25',company:'Example',title:'Developer',
      skills:[{name:'TypeScript',category:'Programming Languages',requirement:'must_have'},
        {name:'Docker',category:'DevOps',requirement:'nice_to_have'}],
    }});
    expect(created.statusCode).toBe(201);
    for (const path of ['skill-demand','skill-gaps','skill-priorities']) {
      const full = await app.inject({method:'GET',url:`/api/v1/analysis/${path}`});
      expect(full.statusCode).toBe(200);
      const filtered = await app.inject({method:'GET',url:`/api/v1/analysis/${path}?search=TYPE&page=3&pageSize=10&sortBy=name`});
      expect(filtered.statusCode).toBe(200);
      expect(filtered.json().totalJobsAnalyzed).toBe(full.json().totalJobsAnalyzed);
      expect(filtered.json().pagination).toMatchObject({page:1,totalItems:1,totalPages:1});
      expect(filtered.json().skills[0]).toEqual(full.json().skills.find((s:{name:string})=>s.name==='TypeScript'));
      if (path === 'skill-priorities') expect(filtered.json().missingInformation).toEqual(full.json().missingInformation);
    }
  });
});
