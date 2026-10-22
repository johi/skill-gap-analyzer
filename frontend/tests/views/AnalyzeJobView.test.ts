import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AnalyzeJobView from '../../src/views/AnalyzeJobView.vue';
import { analyzeJobAdvertisement } from '../../src/api/job-analysis';
import type { JobAdvertisementAnalysis } from '../../src/schemas/job-analysis';

vi.mock('../../src/api/job-analysis', () => ({
    analyzeJobAdvertisement: vi.fn(),
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
