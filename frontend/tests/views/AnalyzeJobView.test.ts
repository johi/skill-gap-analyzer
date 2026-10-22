import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AnalyzeJobView from '@/views/AnalyzeJobView.vue';
import { analyzeJobAdvertisement } from '@/api/job-analysis';
import { getSkills } from '@/api/skills';
import type { JobAdvertisementAnalysis } from '@schemas/job-analysis';

vi.mock('../../src/api/job-analysis', () => ({
    analyzeJobAdvertisement: vi.fn(),
}));
vi.mock('../../src/api/skills', () => ({
    getSkills: vi.fn(),
}));

const advertisement = 'Example Company seeks a Senior TypeScript Developer for our Copenhagen office. Full-time employment.';
const analysis: JobAdvertisementAnalysis = {
    dateFound: '2026-10-21',
    originalText: advertisement,
    requiresReview: false,
    proposal: {
        company: 'Example Company', title: 'Senior TypeScript Developer',
        location: 'Copenhagen', workModel: null, employmentType: 'full_time',
        seniority: 'senior', primaryRole: null, yearsRequired: null,
        educationRequirement: null, languageRequirements: [], salaryRate: null,
        skills: [{ name: 'TypeScript', category: 'language', requirement: 'must_have' }],
    },
};

function mountView() {
    return mount(AnalyzeJobView, {
        global: {
            stubs: {
                RouterLink: { props: ['to'], template: '<a><slot /></a>' },
            },
        },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(analyzeJobAdvertisement).mockResolvedValue(analysis);
    vi.mocked(getSkills).mockResolvedValue([{ id: 1, name: 'TypeScript', category: 'Language', createdAt: '', updatedAt: '' }, { id: 2, name: 'Automated Testing', category: 'Testing', createdAt: '', updatedAt: '' }]);
});

describe('AnalyzeJobView (UC-09–11)', () => {
    it('disables analysis until enough text is supplied', async () => {
        const wrapper = mountView();
        // The action is identified by its visible label.
        const analyze = wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!;
        expect(analyze.attributes('disabled')).toBeDefined();
        await wrapper.get('textarea').setValue('Short');
        expect(analyze.attributes('disabled')).toBeDefined();
    });

    it('displays metadata and skills without saving a job', async () => {
        const wrapper = mountView();
        await wrapper.get('textarea').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        expect(analyzeJobAdvertisement).toHaveBeenCalledWith(advertisement);
        expect(wrapper.text()).toContain('Example Company');
        expect(wrapper.text()).toContain('TypeScript');
        expect(wrapper.text()).toContain('not saved');
    });

    it('shows errors without displaying an analysis', async () => {
        vi.mocked(analyzeJobAdvertisement).mockRejectedValue(new Error('provider unavailable'));
        const wrapper = mountView();
        await wrapper.get('textarea').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain('Unable to analyze');
        expect(wrapper.text()).not.toContain('Extracted metadata');
    });
});


describe('AnalyzeJobView (UC-12)', () => {
    async function analyzedView() {
        const wrapper = mountView();
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        return wrapper;
    }

    it('loads the existing catalogue and allows editing and approving without persisting', async () => {
        const wrapper = await analyzedView();
        expect(getSkills).toHaveBeenCalledOnce();
        expect((wrapper.get('#company').element as HTMLInputElement).value).toBe('Example Company');
        await wrapper.get('#company').setValue('Corrected Company');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Review approved — not saved');
        expect(wrapper.text()).toContain('Corrected Company');
        await wrapper.get('#title').setValue('Changed title');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
    });

    it('replaces an AI skill with an existing catalogue skill', async () => {
        const wrapper = await analyzedView();
        await wrapper.get('#skill-lookup-0').setValue('Automated');
        await wrapper.findAll('button').find(button => button.text().includes('Automated Testing'))!.trigger('click');
        expect((wrapper.get('#skill-name-0').element as HTMLInputElement).value).toBe('Automated Testing');
        expect((wrapper.get('#skill-category-0').element as HTMLInputElement).value).toBe('Testing');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Review approved — not saved');
    });

    it('requires classification for uncertain AI skill requirements', async () => {
        vi.mocked(analyzeJobAdvertisement).mockResolvedValue({
            ...analysis,
            proposal: { ...analysis.proposal, skills: [{ name: 'Test Automation', category: 'Testing', requirement: null }] },
        });
        const wrapper = await analyzedView();
        expect((wrapper.get('#skill-requirement-0').element as HTMLSelectElement).value).toBe('');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
        await wrapper.get('#skill-requirement-0').setValue('nice_to_have');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Review approved — not saved');
    });

    it('discards a proposal without persisting anything', async () => {
        const wrapper = await analyzedView();
        await wrapper.findAll('button').find(button => button.text().includes('Discard analysis'))!.trigger('click');
        expect(wrapper.text()).not.toContain('Review and correct analysis');
        expect((wrapper.get('#job-advertisement').element as HTMLTextAreaElement).value).toBe(advertisement);
    });

    it('blocks approval when the catalogue is unavailable and permits retry', async () => {
        vi.mocked(getSkills).mockRejectedValueOnce(new Error('offline'));
        const wrapper = await analyzedView();
        expect(wrapper.text()).toContain('Unable to load the skill catalogue');
        const submitButton = wrapper.get('form button[type="submit"]');
        expect(submitButton.attributes('disabled')).toBeDefined();
        await wrapper.findAll('button').find(button => button.text().includes('Retry loading skills'))!.trigger('click');
        await flushPromises();
        expect(wrapper.text()).not.toContain('Unable to load the skill catalogue');
        expect(submitButton.attributes('disabled')).toBeUndefined();
    });
});
