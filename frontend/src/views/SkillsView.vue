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

import {
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-vue-next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  <section class="space-y-6">
    <div>
      <h1
          class="
                    text-2xl font-semibold tracking-tight
                    sm:text-3xl
                "
      >
        Skills
      </h1>

      <p class="mt-1 text-sm text-muted-foreground">
        Manage the skill catalogue used to analyze job
        requirements and assess your own proficiency.
      </p>
    </div>

    <div
        class="
                grid gap-6
                lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]
            "
    >
      <Card class="min-w-0">
        <CardHeader>
          <CardTitle>Existing skills</CardTitle>

          <CardDescription>
            Skills available throughout the analyzer.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
              v-if="loading"
              class="space-y-3"
          >
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
            <Skeleton class="h-10 w-full" />
          </div>

          <div
              v-else-if="skills.length === 0"
              class="
                            flex flex-col items-center
                            justify-center py-12 text-center
                        "
          >
            <div
                class="
                                mb-4 flex size-12 items-center
                                justify-center rounded-full bg-muted
                            "
            >
              <Plus
                  class="
                                    size-5
                                    text-muted-foreground
                                "
              />
            </div>

            <h2 class="font-medium">
              No skills yet
            </h2>

            <p
                class="
                                mt-1 max-w-sm text-sm
                                text-muted-foreground
                            "
            >
              Create your first skill using the form.
            </p>
          </div>

          <div
              v-else
              class="overflow-x-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>

                  <TableHead class="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow
                    v-for="skill in skills"
                    :key="skill.id"
                    :class="{
                                        'bg-muted/40':
                                            editingId === skill.id,
                                    }"
                >
                  <TableCell class="font-medium">
                    {{ skill.name }}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {{ skill.category }}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div
                        class="
                                                flex justify-end gap-1
                                            "
                    >
                      <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          :disabled="
                                                    deletingId ===
                                                    skill.id
                                                "
                          @click="
                                                    startEdit(skill)
                                                "
                      >
                        <Pencil
                            class="size-4"
                        />

                        Edit
                      </Button>

                      <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          :disabled="
                                                    deletingId ===
                                                    skill.id
                                                "
                          @click="
                                                    handleDelete(
                                                        skill
                                                    )
                                                "
                      >
                        <Trash2
                            class="size-4"
                        />

                        {{
                          deletingId ===
                          skill.id
                              ? 'Deleting...'
                              : 'Delete'
                        }}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card class="h-fit lg:sticky lg:top-8">
        <CardHeader>
          <CardTitle>
            {{
              editingId === null
                  ? 'Create skill'
                  : 'Edit skill'
            }}
          </CardTitle>

          <CardDescription>
            {{
              editingId === null
                  ? 'Add a skill to the catalogue.'
                  : 'Update the selected skill.'
            }}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
              v-if="error"
              class="
                            mb-4 rounded-md
                            border border-destructive/30
                            bg-destructive/5 p-3
                        "
          >
            <p class="text-sm text-destructive">
              {{ error }}
            </p>
          </div>

          <div
              v-if="validationErrors.length"
              class="
                            mb-4 rounded-md
                            border border-destructive/30
                            bg-destructive/5 p-3
                        "
          >
            <ul
                class="
                                list-disc space-y-1 pl-4
                                text-sm text-destructive
                            "
            >
              <li
                  v-for="
                                    validationError
                                    in validationErrors
                                "
                  :key="validationError"
              >
                {{ validationError }}
              </li>
            </ul>
          </div>

          <form
              class="space-y-4"
              @submit.prevent="handleSubmit"
          >
            <div class="space-y-2">
              <Label for="skill-name">
                Name
              </Label>

              <Input
                  id="skill-name"
                  v-model="form.name"
                  type="text"
                  placeholder="e.g. TypeScript"
                  required
              />
            </div>

            <div class="space-y-2">
              <Label for="skill-category">
                Category
              </Label>

              <Input
                  id="skill-category"
                  v-model="form.category"
                  type="text"
                  placeholder="e.g. Language"
                  required
              />
            </div>

            <div class="flex flex-wrap gap-2 pt-2">
              <Button
                  type="submit"
                  :disabled="saving"
              >
                <Plus
                    v-if="editingId === null"
                    class="size-4"
                />

                <Pencil
                    v-else
                    class="size-4"
                />

                {{
                  saving
                      ? 'Saving...'
                      : editingId === null
                          ? 'Create skill'
                          : 'Save changes'
                }}
              </Button>

              <Button
                  v-if="editingId !== null"
                  type="button"
                  variant="outline"
                  :disabled="saving"
                  @click="cancelEdit"
              >
                <X class="size-4" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </section>
</template>