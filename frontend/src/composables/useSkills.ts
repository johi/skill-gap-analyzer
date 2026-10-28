import { useListPagination } from '@/composables/useListPagination';
import type { Pagination } from '@/schemas/list-pagination';
import { watch, reactive, ref } from 'vue';
import { createSkill, deleteSkill, getSkillsPage, updateSkill } from '@/api/skills';
import { ApiError } from '@/api/client';
import type { Skill, SkillInput } from '@/types/skill';

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useSkills() {
  const {query, update, search, searchInput} = useListPagination();
  const pagination = ref<Pagination | null>(null);
  let sequence = 0;
  const skills = ref<Skill[]>([]);
  const loading = ref(true);
  const saving = ref(false);
  const deletingId = ref<number | null>(null);
  const error = ref<string | null>(null);
  const validationErrors = ref<string[]>([]);
  const editingId = ref<number | null>(null);
  const form = reactive({ name: '', category: '' });

  function clearErrors(): void {
    error.value = null;
    validationErrors.value = [];
  }

  async function loadSkills(): Promise<void> {
    const current = ++sequence;
    loading.value = true;
    error.value = null;
    try {
      const response = await getSkillsPage(query.value);
      if (current !== sequence) return;
      skills.value = response.data;
      pagination.value = response.pagination;
      if (response.pagination.page !== query.value.page) update({page: response.pagination.page}, false);
    } catch (err) {
      if (current === sequence) error.value = getErrorMessage(err, 'Unable to load skills');
    } finally {
      if (current === sequence) loading.value = false;
    }
  }

  function startCreate(): void {
    editingId.value = null;
    form.name = '';
    form.category = '';
    clearErrors();
  }

  function startEdit(skill: Skill): void {
    editingId.value = skill.id;
    form.name = skill.name;
    form.category = skill.category;
    clearErrors();
  }

  function cancelEdit(): void {
    startCreate();
  }

  function handleApiError(err: unknown): void {
    if (err instanceof ApiError && err.error === 'validation_error') {
      validationErrors.value = err.issues.map(issue =>
        issue.path ? `${issue.path}: ${issue.message}` : issue.message
      );
      return;
    }
    error.value = getErrorMessage(err, 'Unable to save skill');
  }

  async function handleSubmit(): Promise<void> {
    saving.value = true;
    clearErrors();
    const input: SkillInput = {
      name: form.name.trim(),
      category: form.category.trim(),
    };
    try {
      if (editingId.value === null) {
        await createSkill(input);
      } else {
        await updateSkill(editingId.value, input);
      }
      startCreate();
      await loadSkills();
    } catch (err) {
      handleApiError(err);
    } finally {
      saving.value = false;
    }
  }

  async function removeSkill(skill: Skill): Promise<void> {
    deletingId.value = skill.id;
    clearErrors();
    try {
      await deleteSkill(skill.id);
      await loadSkills();
      if (editingId.value === skill.id) startCreate();
    } catch (err) {
      error.value = getErrorMessage(err, 'Unable to delete skill');
    } finally {
      deletingId.value = null;
    }
  }

  watch(query, loadSkills, {immediate: true});

  return {
    query, update, search, searchInput, pagination, loadSkills,
    skills, loading, saving, deletingId, error, validationErrors,
    editingId, form, startCreate, startEdit, cancelEdit,
    handleSubmit, removeSkill,
  };
}
