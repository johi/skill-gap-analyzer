<script setup lang="ts">
import {
  onMounted,
  reactive,
  ref,
} from 'vue';

import {
  createSkill,
  deleteSkill,
  getSkills,
  updateSkill,
} from '../api/skills';

import { ApiError } from '../api/client';

import type {
  Skill,
  SkillInput,
} from '../types/skill';

const skills = ref<Skill[]>([]);
const loading = ref(true);
const saving = ref(false);
const deletingId = ref<number | null>(null);

const error = ref<string | null>(null);
const validationErrors = ref<string[]>([]);

const editingId = ref<number | null>(null);

const form = reactive({
  name: '',
  category: '',
});

onMounted(loadSkills);

async function loadSkills(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    skills.value = await getSkills();
  } catch (err) {
    error.value = getErrorMessage(
        err,
        'Unable to load skills'
    );
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

      skills.value = [
        ...skills.value,
        created,
      ].sort(compareSkills);
    } else {
      const updated = await updateSkill(
          editingId.value,
          input
      );

      skills.value = skills.value
          .map((skill) =>
              skill.id === updated.id
                  ? updated
                  : skill
          )
          .sort(compareSkills);
    }

    startCreate();
  } catch (err) {
    handleApiError(err);
  } finally {
    saving.value = false;
  }
}

async function handleDelete(skill: Skill): Promise<void> {
  const confirmed = window.confirm(
      `Delete skill "${skill.name}"?`
  );

  if (!confirmed) {
    return;
  }

  deletingId.value = skill.id;
  clearErrors();

  try {
    await deleteSkill(skill.id);

    skills.value = skills.value.filter(
        (item) => item.id !== skill.id
    );

    if (editingId.value === skill.id) {
      startCreate();
    }
  } catch (err) {
    error.value = getErrorMessage(
        err,
        'Unable to delete skill'
    );
  } finally {
    deletingId.value = null;
  }
}

function handleApiError(err: unknown): void {
  if (
      err instanceof ApiError &&
      err.error === 'validation_error'
  ) {
    validationErrors.value = err.issues.map(
        (issue) =>
            issue.path
                ? `${issue.path}: ${issue.message}`
                : issue.message
    );

    return;
  }

  error.value = getErrorMessage(
      err,
      'Unable to save skill'
  );
}

function getErrorMessage(
    err: unknown,
    fallback: string
): string {
  return err instanceof Error
      ? err.message
      : fallback;
}

function clearErrors(): void {
  error.value = null;
  validationErrors.value = [];
}

function compareSkills(
    first: Skill,
    second: Skill
): number {
  return first.name.localeCompare(second.name);
}
</script>

<template>
  <section>
    <h1>Skills</h1>

    <h2>
      {{ editingId === null
        ? 'Create skill'
        : 'Edit skill'
      }}
    </h2>

    <p v-if="error">
      {{ error }}
    </p>

    <ul v-if="validationErrors.length">
      <li
          v-for="validationError in validationErrors"
          :key="validationError"
      >
        {{ validationError }}
      </li>
    </ul>

    <form @submit.prevent="handleSubmit">
      <p>
        <label>
          Name
          <input
              v-model="form.name"
              type="text"
              required
          >
        </label>
      </p>

      <p>
        <label>
          Category
          <input
              v-model="form.category"
              type="text"
              required
          >
        </label>
      </p>

      <button
          type="submit"
          :disabled="saving"
      >
        {{
          saving
              ? 'Saving...'
              : editingId === null
                  ? 'Create skill'
                  : 'Save changes'
        }}
      </button>

      <button
          v-if="editingId !== null"
          type="button"
          :disabled="saving"
          @click="cancelEdit"
      >
        Cancel
      </button>
    </form>

    <h2>Existing skills</h2>

    <p v-if="loading">
      Loading skills...
    </p>

    <p v-else-if="skills.length === 0">
      No skills found.
    </p>

    <table v-else>
      <thead>
      <tr>
        <th>Name</th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
      </thead>

      <tbody>
      <tr
          v-for="skill in skills"
          :key="skill.id"
      >
        <td>{{ skill.name }}</td>
        <td>{{ skill.category }}</td>

        <td>
          <button
              type="button"
              :disabled="
                                deletingId === skill.id
                            "
              @click="startEdit(skill)"
          >
            Edit
          </button>

          <button
              type="button"
              :disabled="
                                deletingId === skill.id
                            "
              @click="handleDelete(skill)"
          >
            {{
              deletingId === skill.id
                  ? 'Deleting...'
                  : 'Delete'
            }}
          </button>
        </td>
      </tr>
      </tbody>
    </table>
  </section>
</template>