import {beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {ref} from 'vue';
vi.mock('@/composables/useListPagination', () => ({
  useListPagination: (sortBy = 'name', sortOrder = 'asc') => {
    const query = ref({search:'', sortBy, sortOrder, page:1, pageSize:25});
    const searchInput = ref('');
    return { query, searchInput,
      search: (value: string) => {searchInput.value = value; query.value = {...query.value, search:value, page:1};},
      update: (changes: Record<string, unknown>, reset = true) => {
        query.value = {...query.value, ...changes, page: reset ? 1 : (changes.page ?? query.value.page)} as typeof query.value;
      },
    };
  },
}));
import SkillDemandView from '@/views/SkillDemandView.vue';
import {getSkillDemand,getSkillGaps,getSkillPriorities} from '@/api/market-analysis';
vi.mock('@/api/market-analysis', () => ({getSkillDemand:vi.fn(),getSkillGaps:vi.fn(),getSkillPriorities:vi.fn()}));
const skill = {skillId:1,name:'TypeScript',category:'Programming Languages',jobCount:2,mustHaveCount:1,niceToHaveCount:1,demandPercentage:100};
const pagination = {page:1,pageSize:25,totalItems:1,totalPages:1};
describe('Skill Analysis server-side pagination', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSkillDemand).mockResolvedValue({totalJobsAnalyzed:2,skills:[skill],pagination});
    vi.mocked(getSkillGaps).mockResolvedValue({totalJobsAnalyzed:2,skills:[{...skill,proficiency:3,gap:2,status:'assessed' as const}],pagination});
    vi.mocked(getSkillPriorities).mockResolvedValue({totalJobsAnalyzed:2,skills:[{...skill,proficiency:3,gap:2,status:'assessed' as const,demandWeight:0.75,priorityScore:50}],missingInformation:[],pagination});
  });
  it('shows backend demand results and totals', async () => {
    const wrapper = mount(SkillDemandView); await flushPromises();
    expect(wrapper.text()).toContain('TypeScript');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('1 matching skills');
  });
  it('sends server sorting when a heading is clicked', async () => {
    const wrapper = mount(SkillDemandView); await flushPromises();
    const heading = wrapper.findAll('thead button').find(button => button.text().includes('Skill'))!;
    await heading.trigger('click'); await flushPromises();
    expect(getSkillDemand).toHaveBeenCalledWith(expect.objectContaining({sortBy:'name',sortOrder:'asc',page:1}));
  });
  it('loads separate gap and priority pages without changing the number of jobs analyzed', async () => {
    const wrapper = mount(SkillDemandView); await flushPromises();
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click'); await flushPromises();
    expect(getSkillGaps).toHaveBeenCalled(); expect(wrapper.text()).toContain('3/5');
    await wrapper.findAll('[role="tab"]')[2]!.trigger('click'); await flushPromises();
    expect(getSkillPriorities).toHaveBeenCalled(); expect(wrapper.text()).toContain('50.0');
  });
  it('shows a matching empty state', async () => {
    vi.mocked(getSkillDemand).mockResolvedValue({totalJobsAnalyzed:2,skills:[],pagination:{page:1,pageSize:25,totalItems:0,totalPages:0}});
    const wrapper = mount(SkillDemandView); await flushPromises();
    await wrapper.get('input[aria-label="Search skills"]').setValue('missing'); await flushPromises();
    expect(wrapper.text()).toContain('No matching skills found');
  });
});
