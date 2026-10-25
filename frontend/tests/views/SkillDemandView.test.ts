import { nextTick } from 'vue';
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

import {
    getSkillDemand,
    getSkillGaps,
    getSkillPriorities,
} from '@/api/market-analysis';

vi.mock('@/api/market-analysis', () => ({
    getSkillDemand: vi.fn(),
    getSkillGaps: vi.fn(),
    getSkillPriorities: vi.fn(),
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

const gapData = {
    totalJobsAnalyzed: 3,
    skills: [
        {
            ...demandData.skills[0]!,
            proficiency: 5,
            gap: 0,
            status: 'assessed' as const,
        },
        {
            ...demandData.skills[1]!,
            proficiency: 0,
            gap: 5,
            status: 'assessed' as const,
        },
        {
            ...demandData.skills[2]!,
            proficiency: null,
            gap: null,
            status: 'unassessed' as const,
        },
    ],
};

const priorityData = {
    totalJobsAnalyzed: 3,
    skills: [
        {
            ...gapData.skills[0]!,
            demandWeight: 0.5,
            priorityScore: 0,
        },
        {
            ...gapData.skills[1]!,
            demandWeight: 1 / 3,
            priorityScore: 46.3,
        },
        {
            ...gapData.skills[2]!,
            demandWeight: 5 / 6,
            priorityScore: null,
        },
    ],
    missingInformation: ['skill_assessments' as const],
};

async function openGapTab(
    wrapper: ReturnType<typeof mount>
): Promise<void> {
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    await flushPromises();
}

async function openPriorityTab(
    wrapper: ReturnType<typeof mount>
): Promise<void> {
    await wrapper.findAll('[role="tab"]')[2]!.trigger('click');
    await flushPromises();
}

function rowNames(
    wrapper: ReturnType<typeof mount>
): string[] {
    return wrapper.findAll('tbody tr')
        .map((row) => row.find('td').text());
}

describe('SkillDemandView', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(getSkillDemand)
            .mockResolvedValue(demandData);

        vi.mocked(getSkillGaps)
            .mockResolvedValue(gapData);

        vi.mocked(getSkillPriorities)
            .mockResolvedValue(priorityData);
    });

    // UC-26: Market demand

    it('loads and displays skill demand', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(getSkillDemand).toHaveBeenCalledOnce();
        expect(getSkillGaps).not.toHaveBeenCalled();
        expect(getSkillPriorities).not.toHaveBeenCalled();

        expect(wrapper.text()).toContain('Jobs analyzed');
        expect(wrapper.text()).toContain('PHP');
        expect(wrapper.text()).toContain('Docker');
        expect(wrapper.text()).toContain('PostgreSQL');
        expect(wrapper.text()).toContain('66.7%');
        expect(wrapper.text()).toContain('33.3%');
        expect(wrapper.text()).toContain('100.0%');

        expect(rowNames(wrapper))
            .toEqual(['PostgreSQL', 'PHP', 'Docker']);
    });

    it('sorts by skill name in both directions', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        const header = wrapper.findAll('thead button')
            .find((button) => button.text().startsWith('Skill'));

        expect(header).toBeDefined();

        await header!.trigger('click');

        expect(rowNames(wrapper))
            .toEqual(['Docker', 'PHP', 'PostgreSQL']);

        await header!.trigger('click');

        expect(rowNames(wrapper))
            .toEqual(['PostgreSQL', 'PHP', 'Docker']);
    });

    it('sorts by demand percentage', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        const header = wrapper.findAll('thead button')
            .find((button) => button.text().startsWith('Demand'));

        expect(header).toBeDefined();

        await header!.trigger('click');

        expect(rowNames(wrapper))
            .toEqual(['PostgreSQL', 'PHP', 'Docker']);

        await header!.trigger('click');

        expect(rowNames(wrapper))
            .toEqual(['Docker', 'PHP', 'PostgreSQL']);
    });

    it('displays an empty state when no jobs are analyzed', async () => {
        vi.mocked(getSkillDemand).mockResolvedValue({
            totalJobsAnalyzed: 0,
            skills: [],
        });

        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(wrapper.text()).toContain(
            'No skill analysis data available.'
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

        await wrapper.get('[role="alert"] button').trigger('click');
        await flushPromises();

        expect(getSkillDemand).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('PostgreSQL');
    });

    it('shows a loading state while demand is pending', async () => {
        vi.mocked(getSkillDemand).mockReturnValue(
            new Promise(() => {})
        );

        const wrapper = mount(SkillDemandView);

        await nextTick();

        expect(wrapper.get('[role="status"]').text())
            .toContain('Loading skill demand');

        expect(wrapper.find('table').exists()).toBe(false);
    });

    // UC-27: Skill gaps

    it('switches between market demand and skill gaps', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(wrapper.findAll('[role="tab"]')[0]!
            .attributes('aria-selected')).toBe('true');

        await openGapTab(wrapper);

        expect(getSkillGaps).toHaveBeenCalledOnce();

        expect(wrapper.findAll('[role="tab"]')[1]!
            .attributes('aria-selected')).toBe('true');

        expect(wrapper.text()).toContain('Proficiency');
        expect(wrapper.text()).toContain('Gap');
        expect(wrapper.text()).toContain('Status');

        await wrapper.findAll('[role="tab"]')[0]!.trigger('click');
        await flushPromises();

        expect(getSkillDemand).toHaveBeenCalledTimes(2);
        expect(wrapper.findAll('thead th')).toHaveLength(6);
    });

    it('displays assessed proficiency and calculated gaps', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openGapTab(wrapper);

        const rows = wrapper.findAll('tbody tr');

        const php = rows.find((row) =>
            row.find('td').text() === 'PHP'
        );

        const docker = rows.find((row) =>
            row.find('td').text() === 'Docker'
        );

        expect(php).toBeDefined();
        expect(docker).toBeDefined();

        expect(php!.text()).toContain('5/5');
        expect(php!.text()).toContain('Assessed');

        expect(docker!.text()).toContain('0/5');
        expect(docker!.text()).toContain('Assessed');

        const dockerCells = docker!.findAll('td');

        expect(dockerCells[7]!.text()).toBe('5');
    });

    it('displays unassessed skills without a calculated gap', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openGapTab(wrapper);

        const row = wrapper.findAll('tbody tr')
            .find((item) =>
                item.find('td').text() === 'PostgreSQL'
            );

        expect(row).toBeDefined();

        const cells = row!.findAll('td');

        expect(cells[6]!.text()).toBe('—');
        expect(cells[7]!.text()).toBe('—');
        expect(cells[8]!.text()).toBe('Unassessed');
    });

    it('sorts skill gaps and places unassessed values last', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openGapTab(wrapper);

        const header = wrapper.findAll('thead button')
            .find((button) => button.text().startsWith('Gap'));

        expect(header).toBeDefined();

        await header!.trigger('click');

        expect(rowNames(wrapper))
            .toEqual(['Docker', 'PHP', 'PostgreSQL']);

        await header!.trigger('click');

        expect(rowNames(wrapper))
            .toEqual(['PHP', 'Docker', 'PostgreSQL']);
    });

    it('displays an empty state for skill gaps', async () => {
        vi.mocked(getSkillGaps).mockResolvedValue({
            totalJobsAnalyzed: 0,
            skills: [],
        });

        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openGapTab(wrapper);

        expect(wrapper.text()).toContain(
            'No skill analysis data available.'
        );

        expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    });

    it('retries a failed skill-gap request', async () => {
        vi.mocked(getSkillGaps)
            .mockRejectedValueOnce(new Error('Gap analysis unavailable'))
            .mockResolvedValueOnce(gapData);

        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openGapTab(wrapper);

        expect(wrapper.get('[role="alert"]').text())
            .toContain('Gap analysis unavailable');

        await wrapper.get('[role="alert"] button').trigger('click');
        await flushPromises();

        expect(getSkillGaps).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('5/5');
    });

    it('shows a loading state while skill gaps are pending', async () => {
        vi.mocked(getSkillGaps).mockReturnValue(
            new Promise(() => {})
        );

        const wrapper = mount(SkillDemandView);

        await flushPromises();

        await wrapper.findAll('[role="tab"]')[1]!.trigger('click');

        expect(wrapper.get('[role="status"]').text())
            .toContain('Loading skill gaps');

        expect(wrapper.find('table').exists()).toBe(false);
    });

    // UC-28: Skill priority

    it('loads priorities when the Priorities tab is selected', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();

        expect(getSkillPriorities).not.toHaveBeenCalled();

        await openPriorityTab(wrapper);

        expect(getSkillPriorities).toHaveBeenCalledOnce();

        expect(wrapper.findAll('[role="tab"]')[2]!
            .attributes('aria-selected')).toBe('true');

        expect(wrapper.text()).toContain('Demand Weight');
        expect(wrapper.text()).toContain('Priority Score');
        expect(wrapper.text()).toContain('Proficiency');
    });

    it('sorts priorities by descending score by default', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openPriorityTab(wrapper);

        expect(rowNames(wrapper))
            .toEqual(['Docker', 'PHP', 'PostgreSQL']);

        const priorityHeader = wrapper.findAll('thead th')
            .find((header) => header.text().startsWith('Priority Score'));

        expect(priorityHeader).toBeDefined();
        expect(priorityHeader!.attributes('aria-sort'))
            .toBe('descending');
    });

    it('formats demand weights, proficiency and priority scores', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openPriorityTab(wrapper);

        const docker = wrapper.findAll('tbody tr')
            .find((row) => row.find('td').text() === 'Docker');

        expect(docker).toBeDefined();

        const cells = docker!.findAll('td');

        expect(cells[4]!.text()).toBe('33.3%');
        expect(cells[5]!.text()).toBe('0/5');
        expect(cells[6]!.text()).toBe('5');
        expect(cells[7]!.text()).toBe('46.3');
        expect(cells[8]!.text()).toBe('Assessed');
    });

    it('displays unassessed priorities without inventing scores', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openPriorityTab(wrapper);

        const row = wrapper.findAll('tbody tr')
            .find((item) =>
                item.find('td').text() === 'PostgreSQL'
            );

        expect(row).toBeDefined();

        const cells = row!.findAll('td');

        expect(cells[5]!.text()).toBe('—');
        expect(cells[6]!.text()).toBe('—');
        expect(cells[7]!.text()).toBe('—');
        expect(cells[8]!.text()).toBe('Unassessed');
    });

    it('reports missing assessment information', async () => {
        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openPriorityTab(wrapper);

        expect(wrapper.text()).toContain(
            'Additional information needed'
        );

        expect(wrapper.text()).toContain(
            'Assess your proficiency in unassessed skills'
        );
    });

    it('shows a loading state while priorities are pending', async () => {
        vi.mocked(getSkillPriorities).mockReturnValue(
            new Promise(() => {})
        );

        const wrapper = mount(SkillDemandView);

        await flushPromises();

        await wrapper.findAll('[role="tab"]')[2]!.trigger('click');

        expect(wrapper.get('[role="status"]').text())
            .toContain('Loading skill priorities');

        expect(wrapper.find('table').exists()).toBe(false);
    });

    it('retries a failed priority request', async () => {
        vi.mocked(getSkillPriorities)
            .mockRejectedValueOnce(new Error('Priority analysis unavailable'))
            .mockResolvedValueOnce(priorityData);

        const wrapper = mount(SkillDemandView);

        await flushPromises();
        await openPriorityTab(wrapper);

        expect(wrapper.get('[role="alert"]').text())
            .toContain('Priority analysis unavailable');

        await wrapper.get('[role="alert"] button').trigger('click');
        await flushPromises();

        expect(getSkillPriorities).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('46.3');
    });
});
