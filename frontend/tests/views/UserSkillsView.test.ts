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
import UserSkillsView from '@/views/UserSkillsView.vue';
import {getSkillAssessmentPage, setUserSkillLevel, deleteUserSkill} from '@/api/user-skills';
vi.mock('@/api/user-skills', () => ({getSkillAssessmentPage:vi.fn(), setUserSkillLevel:vi.fn(), deleteUserSkill:vi.fn()}));
type SkillAssessmentPage = Awaited<ReturnType<typeof getSkillAssessmentPage>>;
const initial: SkillAssessmentPage['data'] = [{id:1,name:'TypeScript',category:'Programming Languages',level:null},{id:2,name:'PostgreSQL',category:'Databases',level:3}];
const response = (data: SkillAssessmentPage['data'] = initial): SkillAssessmentPage => ({data,pagination:{page:1,pageSize:25,totalItems:data.length,totalPages:1}});
describe('My Skills paginated assessments', () => {
  beforeEach(() => {vi.resetAllMocks(); vi.mocked(getSkillAssessmentPage).mockResolvedValue(response());});
  it('loads assessed and unassessed catalogue rows', async () => {
    const wrapper = mount(UserSkillsView); await flushPromises();
    expect(wrapper.text()).toContain('TypeScript');
    expect(wrapper.findAll('tbody select')).toHaveLength(2);
    expect((wrapper.findAll('tbody select')[0]!.element as HTMLSelectElement).value).toBe('');
  });
  it('saves proficiency by skill ID and refreshes the page', async () => {
    vi.mocked(setUserSkillLevel).mockResolvedValue({skillId:1,level:4,updatedAt:'2026-01-01T00:00:00Z'});
    const wrapper = mount(UserSkillsView); await flushPromises();
    vi.mocked(getSkillAssessmentPage).mockResolvedValue(response([{...initial[0]!,level:4},initial[1]!]));
    await wrapper.findAll('tbody select')[0]!.setValue('4'); await flushPromises();
    expect(setUserSkillLevel).toHaveBeenCalledWith(1,4);
    expect((wrapper.findAll('tbody select')[0]!.element as HTMLSelectElement).value).toBe('4');
  });
  it('removes an assessment and restores the unassessed state', async () => {
    vi.mocked(deleteUserSkill).mockResolvedValue(undefined);
    const wrapper = mount(UserSkillsView); await flushPromises();
    vi.mocked(getSkillAssessmentPage).mockResolvedValue(response([initial[0]!,{...initial[1]!,level:null}]));
    await wrapper.findAll('tbody select')[1]!.setValue(''); await flushPromises();
    expect(deleteUserSkill).toHaveBeenCalledWith(2);
    expect((wrapper.findAll('tbody select')[1]!.element as HTMLSelectElement).value).toBe('');
  });
});
