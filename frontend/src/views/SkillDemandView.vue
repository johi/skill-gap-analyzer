
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { getSkillDemand } from '@/api/market-analysis';
import type {
  SkillDemand,
  SkillDemandResult,
} from '@/types/market-analysis';

type SortKey =
    | 'name'
    | 'category'
    | 'jobCount'
    | 'mustHaveCount'
    | 'niceToHaveCount'
    | 'demandPercentage';

const result = ref<SkillDemandResult | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const sortKey = ref<SortKey>('jobCount');
const sortDescending = ref(true);

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Skill' },
  { key: 'category', label: 'Category' },
  { key: 'jobCount', label: 'Jobs' },
  { key: 'mustHaveCount', label: 'Must-have' },
  { key: 'niceToHaveCount', label: 'Nice-to-have' },
  { key: 'demandPercentage', label: 'Demand' },
];

const sortedSkills = computed(() => {
  const skills = [...(result.value?.skills ?? [])];

  return skills.sort((a, b) => {
    const key = sortKey.value;
    const left = a[key];
    const right = b[key];

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
    sortDescending.value = !['name', 'category'].includes(key);
  }
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return '';
  return sortDescending.value ? ' ↓' : ' ↑';
}

async function loadDemand(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    result.value = await getSkillDemand();
  } catch (err) {
    result.value = null;
    error.value = err instanceof Error
        ? err.message
        : 'Unable to load skill demand.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDemand);
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Skill Demand
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Analyze how frequently skills appear in active job opportunities.
      </p>
    </div>

    <p v-if="loading" role="status" class="text-sm text-muted-foreground">
      Loading skill demand...
    </p>

    <div v-else-if="error" role="alert" class="space-y-3">
      <p class="text-sm text-destructive">{{ error }}</p>
      <button
          type="button"
          class="rounded-md border px-3 py-2 text-sm hover:bg-muted"
          @click="loadDemand"
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
        No skill demand data available. Add skills to active jobs to
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
            <td class="px-4 py-3 font-medium">
              {{ skill.name }}
            </td>
            <td class="px-4 py-3 text-muted-foreground">
              {{ skill.category }}
            </td>
            <td class="px-4 py-3 tabular-nums">
              {{ skill.jobCount }}
            </td>
            <td class="px-4 py-3 tabular-nums">
              {{ skill.mustHaveCount }}
            </td>
            <td class="px-4 py-3 tabular-nums">
              {{ skill.niceToHaveCount }}
            </td>
            <td class="px-4 py-3 tabular-nums font-medium">
              {{ skill.demandPercentage.toFixed(1) }}%
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
