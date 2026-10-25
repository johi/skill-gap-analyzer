
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import {
  getSkillDemand,
  getSkillGaps,
} from '@/api/market-analysis';

import type {
  SkillDemand,
  SkillDemandResult,
  SkillGap,
  SkillGapResult,
} from '@/types/market-analysis';

type Tab = 'demand' | 'gaps';

type SortKey =
    | 'name'
    | 'category'
    | 'jobCount'
    | 'mustHaveCount'
    | 'niceToHaveCount'
    | 'demandPercentage'
    | 'proficiency'
    | 'gap'
    | 'status';

const activeTab = ref<Tab>('demand');

const demandResult = ref<SkillDemandResult | null>(null);
const gapResult = ref<SkillGapResult | null>(null);

const loading = ref(false);
const error = ref<string | null>(null);

const sortKey = ref<SortKey>('jobCount');
const sortDescending = ref(true);

const demandColumns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Skill' },
  { key: 'category', label: 'Category' },
  { key: 'jobCount', label: 'Jobs' },
  { key: 'mustHaveCount', label: 'Must-have' },
  { key: 'niceToHaveCount', label: 'Nice-to-have' },
  { key: 'demandPercentage', label: 'Demand' },
];

const gapColumns: { key: SortKey; label: string }[] = [
  ...demandColumns,
  { key: 'proficiency', label: 'Proficiency' },
  { key: 'gap', label: 'Gap' },
  { key: 'status', label: 'Status' },
];

const columns = computed(() =>
    activeTab.value === 'demand'
        ? demandColumns
        : gapColumns
);

const result = computed(() =>
    activeTab.value === 'demand'
        ? demandResult.value
        : gapResult.value
);

const sortedSkills = computed<(SkillDemand | SkillGap)[]>(() => {
  const skills = [...(result.value?.skills ?? [])];

  return skills.sort((a, b) => {
    const key = sortKey.value;

    const left = key in a
        ? (a as unknown as Record<SortKey, string | number | null>)[key]
        : null;

    const right = key in b
        ? (b as unknown as Record<SortKey, string | number | null>)[key]
        : null;

    if (left === null && right === null) {
      return a.name.localeCompare(b.name);
    }

    if (left === null) return 1;
    if (right === null) return -1;

    let comparison: number;

    if (typeof left === 'number' && typeof right === 'number') {
      comparison = left - right;
    } else {
      comparison = String(left).localeCompare(String(right));
    }

    if (comparison === 0) {
      comparison = a.name.localeCompare(b.name);
    }

    return sortDescending.value ? -comparison : comparison;
  });
});

function sortBy(key: SortKey): void {
  if (sortKey.value === key) {
    sortDescending.value = !sortDescending.value;
  } else {
    sortKey.value = key;
    sortDescending.value = !['name', 'category', 'status'].includes(key);
  }
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return '';
  return sortDescending.value ? ' ↓' : ' ↑';
}

async function loadCurrentTab(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    if (activeTab.value === 'demand') {
      demandResult.value = await getSkillDemand();
    } else {
      gapResult.value = await getSkillGaps();
    }
  } catch (err) {
    error.value = err instanceof Error
        ? err.message
        : 'Unable to load analysis.';
  } finally {
    loading.value = false;
  }
}

async function selectTab(tab: Tab): Promise<void> {
  if (activeTab.value === tab) return;

  activeTab.value = tab;
  sortKey.value = 'jobCount';
  sortDescending.value = true;

  await loadCurrentTab();
}

function formatCell(
    skill: SkillDemand | SkillGap,
    key: SortKey
): string {
  switch (key) {
    case 'demandPercentage':
      return `${skill.demandPercentage.toFixed(1)}%`;

    case 'proficiency':
      return 'proficiency' in skill
          ? skill.proficiency === null
              ? '—'
              : `${skill.proficiency}/5`
          : '—';

    case 'gap':
      return 'gap' in skill
          ? skill.gap === null
              ? '—'
              : String(skill.gap)
          : '—';

    case 'status':
      return 'status' in skill
          ? skill.status === 'assessed'
              ? 'Assessed'
              : 'Unassessed'
          : '—';

    default:
      return String(skill[key as keyof SkillDemand]);
  }
}

onMounted(loadCurrentTab);
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Skill Analysis
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Explore market demand and compare it with your assessed skill levels.
      </p>
    </div>

    <div
        role="tablist"
        aria-label="Skill analysis"
        class="flex gap-2 border-b"
    >
      <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'demand'"
          class="border-b-2 px-4 py-2 text-sm font-medium"
          :class="
          activeTab === 'demand'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
          @click="selectTab('demand')"
      >
        Market Demand
      </button>

      <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'gaps'"
          class="border-b-2 px-4 py-2 text-sm font-medium"
          :class="
          activeTab === 'gaps'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        "
          @click="selectTab('gaps')"
      >
        Skill Gaps
      </button>
    </div>

    <p v-if="loading" role="status" class="text-sm text-muted-foreground">
      Loading {{ activeTab === 'demand' ? 'skill demand' : 'skill gaps' }}...
    </p>

    <div v-else-if="error" role="alert" class="space-y-3">
      <p class="text-sm text-destructive">{{ error }}</p>
      <button
          type="button"
          class="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          @click="loadCurrentTab"
      >
        Retry
      </button>
    </div>

    <template v-else-if="result">
      <div class="rounded-lg border bg-card p-5">
        <p class="text-sm text-muted-foreground">
          Jobs analyzed
        </p>
        <p class="mt-1 text-3xl font-semibold">
          {{ result.totalJobsAnalyzed }}
        </p>
        <p class="mt-2 text-xs text-muted-foreground">
          Includes non-expired jobs with at least one associated skill.
        </p>
      </div>

      <p
          v-if="result.skills.length === 0"
          class="rounded-lg border p-6 text-sm text-muted-foreground"
      >
        No skill analysis data available. Add skills to active jobs to
        generate the analysis.
      </p>

      <div v-else class="overflow-x-auto rounded-lg border">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="border-b bg-muted/50">
          <tr>
            <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                :aria-sort="
                  sortKey === column.key
                    ? sortDescending ? 'descending' : 'ascending'
                    : 'none'
                "
                class="px-4 py-3 text-left font-medium"
            >
              <button
                  type="button"
                  class="whitespace-nowrap hover:underline"
                  @click="sortBy(column.key)"
              >
                {{ column.label }}{{ sortIndicator(column.key) }}
              </button>
            </th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="skill in sortedSkills"
              :key="skill.skillId"
              class="border-b last:border-0 hover:bg-muted/30"
          >
            <td
                v-for="column in columns"
                :key="column.key"
                class="px-4 py-3"
                :class="{
                  'font-medium': column.key === 'name',
                  'text-muted-foreground': column.key === 'category',
                  'tabular-nums': !['name', 'category', 'status'].includes(column.key),
                }"
            >
              {{ formatCell(skill, column.key) }}
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <p
          v-if="activeTab === 'gaps'"
          class="text-xs text-muted-foreground"
      >
        Gap = 5 − proficiency. Unassessed skills have no calculated gap.
      </p>
    </template>
  </section>
</template>
