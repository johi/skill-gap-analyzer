import { ref, watch } from 'vue';
import { getSkillAssessmentPage, deleteUserSkill, setUserSkillLevel } from '@/api/user-skills';
import { skillLevelSchema } from '@/schemas/user-skill';
import { useListPagination } from '@/composables/useListPagination';
import type { Pagination } from '@/schemas/list-pagination';
import type { SkillLevel } from '@/types/user-skill';

export interface SkillRow {
  id: number;
  name: string;
  category: string;
  level: SkillLevel | null;
}

export function useUserSkills() {
  const {query, update, search, searchInput} = useListPagination();
  const rows = ref<SkillRow[]>([]);
  const pagination = ref<Pagination | null>(null);
  const loading = ref(true); const error = ref<string | null>(null);
  const savingSkillId = ref<number | null>(null); let sequence = 0;

  async function loadData() {
    const current = ++sequence; loading.value = true; error.value = null;
    try {
      const response = await getSkillAssessmentPage(query.value);
      if (current !== sequence) return;
      rows.value = response.data; pagination.value = response.pagination;
      if (response.pagination.page !== query.value.page) update({page: response.pagination.page}, false);
    } catch (err) {if (current === sequence) error.value = err instanceof Error ? err.message : 'Unable to load assessments';}
    finally {if (current === sequence) loading.value = false;}
  }

  async function setLevel(row: SkillRow, value: string) {
    if (value === '' && row.level === null) return;
    savingSkillId.value = row.id; error.value = null;
    try {
      if (value === '') await deleteUserSkill(row.id);
      else await setUserSkillLevel(row.id, skillLevelSchema.parse(Number(value)));
      await loadData();
    } catch (err) {error.value = err instanceof Error ? err.message : 'Unable to update assessment';}
    finally {savingSkillId.value = null;}
  }

  watch(query, loadData, {immediate: true});

  return {rows, loading, error, savingSkillId, setLevel, query, update, search, searchInput, pagination};
}
