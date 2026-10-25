import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';

import JobMatch from '@/components/jobs/JobMatch.vue';
import { useJobMatch } from '@/composables/useJobMatch';
import type { JobMatchResult } from '@/schemas/job-match';

vi.mock('@/composables/useJobMatch', () => ({
  useJobMatch: vi.fn(),
}));

const sample: JobMatchResult = {
  matchPercentage: 100,
  assessmentCoverage: 50,
  totalSkills: 2,
  assessedSkills: 1,
  missingInformation: ['skill_assessments'],
  skills: [
    {
      id: 1,
      name: 'PHP',
      category: 'Programming Languages',
      requirement: 'must_have',
      proficiency: 5,
      matchFactor: 1,
      status: 'assessed',
    },
    {
      id: 2,
      name: 'Docker',
      category: 'DevOps',
      requirement: 'must_have',
      proficiency: null,
      matchFactor: null,
      status: 'unassessed',
    },
  ],
};

function setup(overrides: Partial<JobMatchResult> = {}, options: {
  loading?: boolean;
  error?: string | null;
  noResult?: boolean;
} = {}) {
  const loadMatch = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useJobMatch).mockReturnValue({
    result: ref(options.noResult ? null : { ...sample, ...overrides }),
    loading: ref(options.loading ?? false),
    error: ref(options.error ?? null),
    loadMatch,
  });

  const wrapper = mount(JobMatch, {
    props: { jobId: 42 },
    global: {
      stubs: {
        Card: { template: '<section><slot /></section>' },
        CardHeader: { template: '<div><slot /></div>' },
        CardContent: { template: '<div><slot /></div>' },
        CardTitle: { template: '<h2><slot /></h2>' },
        CardDescription: { template: '<p><slot /></p>' },
        Button: { props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>' },
        Badge: { template: '<span><slot /></span>' },
        Table: { template: '<table><slot /></table>' },
        TableHeader: { template: '<thead><slot /></thead>' },
        TableBody: { template: '<tbody><slot /></tbody>' },
        TableRow: { template: '<tr><slot /></tr>' },
        TableHead: { template: '<th><slot /></th>' },
        TableCell: { template: '<td><slot /></td>' },
      },
    },
  });

  return { wrapper, loadMatch };
}

describe('JobMatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the calculated match and weighted coverage', () => {
    const { wrapper } = setup();
    expect(wrapper.text()).toContain('Calculated match');
    expect(wrapper.text()).toContain('100%');
    expect(wrapper.text()).toContain('50%');
    expect(wrapper.text()).toContain('1 of 2 assessed');
  });

  it('shows skill proficiency, requirement, and match factor', () => {
    const { wrapper } = setup();
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain('PHP');
    expect(rows[0]!.text()).toContain('Must have');
    expect(rows[0]!.text()).toContain('5/5');
    expect(rows[0]!.text()).toContain('100%');
    expect(rows[1]!.text()).toContain('Docker');
    expect(rows[1]!.text()).toContain('Unassessed');
  });

  it('explains that unassessed skills are excluded from the match', () => {
    const { wrapper } = setup();
    expect(wrapper.text()).toContain('They are excluded from the match');
  });

  it('shows guidance when no skills are assessed', () => {
    const { wrapper } = setup({
      matchPercentage: null,
      assessmentCoverage: 0,
      assessedSkills: 0,
      missingInformation: ['skill_assessments'],
      skills: sample.skills.map(skill => ({
        ...skill,
        proficiency: null,
        matchFactor: null,
        status: 'unassessed' as const,
      })),
    });
    expect(wrapper.text()).toContain('Assess at least one required skill');
    expect(wrapper.text()).toContain('0%');
  });

  it('explains when a job has no assigned requirements', () => {
    const { wrapper } = setup({
      matchPercentage: null,
      assessmentCoverage: 0,
      totalSkills: 0,
      assessedSkills: 0,
      skills: [],
      missingInformation: ['job_skills'],
    });
    expect(wrapper.text()).toContain('No skill requirements have been assigned');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
  });

  it('shows loading state and disables Refresh', () => {
    const { wrapper } = setup({}, { loading: true });
    expect(wrapper.text()).toContain('Calculating job match...');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
  });

  it('shows API errors', () => {
    const { wrapper } = setup({}, { error: 'Unable to calculate job match', noResult: true });
    expect(wrapper.text()).toContain('Unable to calculate job match');
  });

  it('requests a fresh match when Refresh is clicked', async () => {
    const { wrapper, loadMatch } = setup();
    await wrapper.get('button').trigger('click');
    await nextTick();
    expect(loadMatch).toHaveBeenCalledTimes(1);
  });
});
