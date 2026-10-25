
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    flushPromises,
    mount,
} from '@vue/test-utils';

import SkillDemandView from '@/views/SkillDemandView.vue';
import { getSkillDemand } from '@/api/market-analysis';

vi.mock('@/api/market-analysis', () => ({
    getSkillDemand: vi.fn(),
}));

const demandData = {
    totalJobsAnalyzed: 3,
    skills: [
        {
            skillId: 1,
            name: 'PHP',
            category: 'Programming Languages',
            jobCount: 2,
            mustHaveCount: 1,
            niceToHaveCount: 1,
            demandPercentage: 66.7,
        },
        {
            skillId: 2,
            name: 'Docker',
            category: 'DevOps',
            jobCount: 1,
            mustHaveCount: 1,
            niceToHaveCount: 0,
            demandPercentage: 33.3,
        },
        {
            skillId: 3,
            name: 'PostgreSQL',
            category: 'Databases',
            jobCount: 3,
            mustHaveCount: 2,
            niceToHaveCount: 1,
            demandPercentage: 100,
        },
    ],
};

describe('SkillDemandView', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(getSkillDemand)
            .mockResolvedValue(demandData);
    });

    it('loads and displays skill demand', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(getSkillDemand).toHaveBeenCalledOnce();

        expect(wrapper.text()).toContain('Jobs analyzed');
        expect(wrapper.text()).toContain('PHP');
        expect(wrapper.text()).toContain('Docker');
        expect(wrapper.text()).toContain('PostgreSQL');
        expect(wrapper.text()).toContain('66.7%');
        expect(wrapper.text()).toContain('33.3%');
        expect(wrapper.text()).toContain('100.0%');

        const rows = wrapper.findAll('tbody tr');

        expect(rows).toHaveLength(3);

        // Default ordering: job count descending.
        expect(rows.map((row) => row.find('td').text()))
            .toEqual(['PostgreSQL', 'PHP', 'Docker']);
    });

    it('sorts by skill name in both directions', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        const skillHeader = wrapper.findAll('thead button')
            .find((button) => button.text().startsWith('Skill'));

        expect(skillHeader).toBeDefined();

        await skillHeader!.trigger('click');

        expect(
            wrapper.findAll('tbody tr')
                .map((row) => row.find('td').text())
        ).toEqual(['Docker', 'PHP', 'PostgreSQL']);

        await skillHeader!.trigger('click');

        expect(
            wrapper.findAll('tbody tr')
                .map((row) => row.find('td').text())
        ).toEqual(['PostgreSQL', 'PHP', 'Docker']);
    });

    it('sorts by demand percentage', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        const demandHeader = wrapper.findAll('thead button')
            .find((button) => button.text().startsWith('Demand'));

        expect(demandHeader).toBeDefined();

        await demandHeader!.trigger('click');

        expect(
            wrapper.findAll('tbody tr')
                .map((row) => row.find('td').text())
        ).toEqual(['PostgreSQL', 'PHP', 'Docker']);

        await demandHeader!.trigger('click');

        expect(
            wrapper.findAll('tbody tr')
                .map((row) => row.find('td').text())
        ).toEqual(['Docker', 'PHP', 'PostgreSQL']);
    });

    it('displays an empty state when no jobs are analyzed', async () => {
        vi.mocked(getSkillDemand).mockResolvedValue({
            totalJobsAnalyzed: 0,
            skills: [],
        });

        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(wrapper.text()).toContain(
            'No skill demand data available.'
        );

        expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    });

    it('displays an error and retries successfully', async () => {
        vi.mocked(getSkillDemand)
            .mockRejectedValueOnce(new Error('Network unavailable'))
            .mockResolvedValueOnce(demandData);

        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(wrapper.get('[role="alert"]').text())
            .toContain('Network unavailable');

        await wrapper.get('button').trigger('click');

        await flushPromises();

        expect(getSkillDemand).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('PostgreSQL');
    });

    it('shows a loading state while the request is pending', async () => {
        vi.mocked(getSkillDemand).mockReturnValue(
            new Promise(() => {})
        );

        const wrapper = mount(SkillDemandView);

        expect(wrapper.get('[role="status"]').text())
            .toContain('Loading skill demand');

        expect(wrapper.find('table').exists()).toBe(false);
    });
});
