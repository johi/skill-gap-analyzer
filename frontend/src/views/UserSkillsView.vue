<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
} from 'vue';

import {getSkills} from '@/api/skills';

import {
  deleteUserSkill,
  getUserSkills,
  setUserSkillLevel,
} from '@/api/user-skills';

import type {Skill} from '@/types/skill';
import type {
  SkillLevel,
  UserSkill,
} from '@/types/user-skill';

import {
  ChartNoAxesColumnIncreasing,
  CircleHelp,
} from 'lucide-vue-next';

import {Badge} from '@/components/ui/badge';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {Skeleton} from '@/components/ui/skeleton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {skillLevelSchema} from '@/schemas/user-skill';
interface SkillRow {
  id: number;
  name: string;
  category: string;
  level: SkillLevel | null;
}

const skills = ref<Skill[]>([]);
const userSkills = ref<UserSkill[]>([]);

const loading = ref(true);
const error = ref<string | null>(null);
const savingSkillId = ref<number | null>(null);

const rows = computed<SkillRow[]>(() => {
  const assessments = new Map(
      userSkills.value.map((assessment) => [
        assessment.skillId,
        assessment,
      ])
  );

  return skills.value.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    level: assessments.get(skill.id)?.level ?? null,
  }));
});

onMounted(loadData);

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const [
      loadedSkills,
      loadedUserSkills,
    ] = await Promise.all([
      getSkills(),
      getUserSkills(),
    ]);

    skills.value = loadedSkills;
    userSkills.value = loadedUserSkills;
  } catch (err) {
    error.value = getErrorMessage(
        err,
        'Unable to load skill assessments'
    );
  } finally {
    loading.value = false;
  }
}

async function setLevel(
    row: SkillRow,
    event: Event
): Promise<void> {
  const target = event.target as HTMLSelectElement;
  const value = target.value;

  if (value === '') {
    await removeAssessment(row);

    return;
  }

  const level = skillLevelSchema.parse(
      Number(value)
  );

  savingSkillId.value = row.id;
  error.value = null;

  try {
    const assessment = await setUserSkillLevel(
        row.id,
        level
    );

    const existingIndex = userSkills.value.findIndex(
        (item) => item.skillId === row.id
    );

    const updated: UserSkill = {
      skillId: assessment.skillId,
      name: row.name,
      category: row.category,
      level: assessment.level,
      updatedAt: assessment.updatedAt,
    };

    if (existingIndex === -1) {
      userSkills.value.push(updated);
    } else {
      userSkills.value[existingIndex] = updated;
    }
  } catch (err) {
    error.value = getErrorMessage(
        err,
        'Unable to save skill assessment'
    );
  } finally {
    savingSkillId.value = null;
  }
}

async function removeAssessment(
    row: SkillRow
): Promise<void> {
  if (row.level === null) {
    return;
  }

  savingSkillId.value = row.id;
  error.value = null;

  try {
    await deleteUserSkill(row.id);

    userSkills.value = userSkills.value.filter(
        (item) => item.skillId !== row.id
    );
  } catch (err) {
    error.value = getErrorMessage(
        err,
        'Unable to remove skill assessment'
    );
  } finally {
    savingSkillId.value = null;
  }
}

function getErrorMessage(
    err: unknown,
    fallback: string
): string {
  return err instanceof Error
      ? err.message
      : fallback;
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
        My Skills
      </h1>

      <p class="mt-1 text-sm text-muted-foreground">
        Assess your current proficiency to identify gaps
        between your skills and job requirements.
      </p>
    </div>

    <div
        v-if="error"
        class="
                rounded-md border border-destructive/30
                bg-destructive/5 p-4
            "
    >
      <p class="text-sm text-destructive">
        {{ error }}
      </p>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div
              class="
                            flex size-9 items-center justify-center
                            rounded-lg bg-muted
                        "
          >
            <ChartNoAxesColumnIncreasing
                class="size-4"
            />
          </div>

          <div>
            <CardTitle>
              Skill assessment
            </CardTitle>

            <CardDescription>
              Rate each skill from 0 to 5 based on
              your current proficiency.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
            v-if="loading"
            class="space-y-3"
        >
          <Skeleton class="h-12 w-full"/>
          <Skeleton class="h-12 w-full"/>
          <Skeleton class="h-12 w-full"/>
          <Skeleton class="h-12 w-full"/>
        </div>

        <div
            v-else-if="rows.length === 0"
            class="
                        flex flex-col items-center justify-center
                        py-12 text-center
                    "
        >
          <div
              class="
                            mb-4 flex size-12 items-center
                            justify-center rounded-full bg-muted
                        "
          >
            <CircleHelp
                class="
                                size-5 text-muted-foreground
                            "
            />
          </div>

          <h2 class="font-medium">
            No skills available
          </h2>

          <p
              class="
                            mt-1 max-w-sm text-sm
                            text-muted-foreground
                        "
          >
            Add skills to the catalogue before
            assessing your proficiency.
          </p>
        </div>

        <div
            v-else
            class="overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Category</TableHead>
                <TableHead class="w-56">
                  Proficiency
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow
                  v-for="row in rows"
                  :key="row.id"
              >
                <TableCell class="font-medium">
                  {{ row.name }}
                </TableCell>

                <TableCell>
                  <Badge variant="secondary">
                    {{ row.category }}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div
                      class="
                                            flex items-center gap-3
                                        "
                  >
                    <select
                        :value="row.level ?? ''"
                        :disabled="
                                                savingSkillId ===
                                                row.id
                                            "
                        class="
                                                h-9 w-36
                                                rounded-md border
                                                border-input
                                                bg-background
                                                px-3 py-1
                                                text-sm shadow-xs
                                                outline-none
                                                transition-colors
                                                focus-visible:border-ring
                                                focus-visible:ring-[3px]
                                                focus-visible:ring-ring/50
                                                disabled:cursor-not-allowed
                                                disabled:opacity-50
                                            "
                        @change="
                                                setLevel(
                                                    row,
                                                    $event
                                                )
                                            "
                    >
                      <option value="">
                        Not assessed
                      </option>

                      <option
                          v-for="level in 6"
                          :key="level - 1"
                          :value="level - 1"
                      >
                        {{ level - 1 }}
                      </option>
                    </select>

                    <span
                        v-if="
                                                savingSkillId ===
                                                row.id
                                            "
                        class="
                                                text-xs
                                                text-muted-foreground
                                            "
                    >
                                            Saving...
                                        </span>

                    <Badge
                        v-else-if="
                                                row.level !== null
                                            "
                        variant="outline"
                        class="tabular-nums"
                    >
                      {{ row.level }} / 5
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <div
        class="
                flex gap-3 rounded-lg border bg-muted/20
                px-4 py-3
            "
    >
      <CircleHelp
          class="
                    mt-0.5 size-4 shrink-0
                    text-muted-foreground
                "
      />

      <p
          class="
                    text-sm leading-relaxed
                    text-muted-foreground
                "
      >
        Use 0 for no practical experience and 5 for
        expert-level proficiency. Select
        <span class="font-medium text-foreground">
                    Not assessed
                </span>
        to remove an existing assessment.
      </p>
    </div>
  </section>
</template>