import { onMounted, reactive, ref } from 'vue';
import { createSkill, deleteSkill, getSkills, updateSkill } from '@/api/skills';
import { ApiError } from '@/api/client';
import type { Skill, SkillInput } from '@/types/skill';

function compareSkills(first: Skill, second: Skill): number {
  return first.name.localeCompare(second.name);
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useSkills() {
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
    loading.value = true;
    error.value = null;
    try {
      skills.value = await getSkills();
    } catch (err) {
      error.value = getErrorMessage(err, 'Unable to load skills');
    } finally {
      loading.value = false;
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
        const created = await createSkill(input);
        skills.value = [...skills.value, created].sort(compareSkills);
      } else {
        const updated = await updateSkill(editingId.value, input);
        skills.value = skills.value
          .map(skill => skill.id === updated.id ? updated : skill)
          .sort(compareSkills);
      }
      startCreate();
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
      skills.value = skills.value.filter(item => item.id !== skill.id);
      if (editingId.value === skill.id) startCreate();
    } catch (err) {
      error.value = getErrorMessage(err, 'Unable to delete skill');
    } finally {
      deletingId.value = null;
    }
  }

  onMounted(loadSkills);

  return {
    skills, loading, saving, deletingId, error, validationErrors,
    editingId, form, startCreate, startEdit, cancelEdit,
    handleSubmit, removeSkill,
  };
}
