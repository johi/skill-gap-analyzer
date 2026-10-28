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
import SkillsView from '@/views/SkillsView.vue';
import {createSkill, getSkillsPage, mergeSkills} from '@/api/skills';
vi.mock('@/api/skills', () => ({getSkillsPage:vi.fn(), mergeSkills:vi.fn(), createSkill:vi.fn(), updateSkill:vi.fn(), deleteSkill:vi.fn()}));
const skill = (id: number, name: string) => ({id, name, category:'Tools', createdAt:'2026-01-01T00:00:00Z', updatedAt:'2026-01-01T00:00:00Z'});
const items = [skill(1,'TypeScript'),skill(2,'PostgreSQL')];
const page = (data = items, page = 1, totalItems = data.length) => ({data, pagination:{page,pageSize:25,totalItems,totalPages: Math.ceil(totalItems/25)}});
describe('SkillsView paginated catalogue and merging', () => {
  beforeEach(() => {vi.resetAllMocks(); vi.mocked(getSkillsPage).mockResolvedValue(page()); vi.stubGlobal('confirm', () => true);});
  it('loads a paginated catalogue', async () => {
    const wrapper = mount(SkillsView); await flushPromises();
    expect(getSkillsPage).toHaveBeenCalled();
    expect(wrapper.text()).toContain('TypeScript');
    expect(wrapper.text()).toContain('2 matching skills');
  });
  it('searches on the backend and keeps selected IDs when the page changes', async () => {
    const wrapper = mount(SkillsView); await flushPromises();
    await wrapper.get('input[aria-label="Select TypeScript"]').setValue(true);
    vi.mocked(getSkillsPage).mockResolvedValue(page([skill(3,'Docker')], 1, 1));
    await wrapper.get('input[aria-label="Search skills"]').setValue('Dock'); await flushPromises();
    expect(getSkillsPage).toHaveBeenCalledWith(expect.objectContaining({search:'Dock',page:1}));
    expect(wrapper.text()).toContain('Merge 1 selected');
  });
  it('creates a skill and refreshes the current page', async () => {
    vi.mocked(createSkill).mockResolvedValue(skill(3,'Vue'));
    const wrapper = mount(SkillsView); await flushPromises();
    vi.mocked(getSkillsPage).mockResolvedValue(page([...items,skill(3,'Vue')]));
    await wrapper.get('#skill-name').setValue('Vue'); await wrapper.get('#skill-category').setValue('Tools');
    await wrapper.get('form').trigger('submit'); await flushPromises();
    expect(createSkill).toHaveBeenCalledWith({name:'Vue',category:'Tools'});
    expect(wrapper.text()).toContain('Vue');
  });
});
