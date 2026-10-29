<script setup lang="ts">
import {useUserSkills} from '@/composables/useUserSkills';
import SkillAssessmentTable from '@/components/user-skills/SkillAssessmentTable.vue';
import SkillListControls from '@/components/ui/SkillListControls.vue';
import SkillAssessmentGuide from '@/components/user-skills/SkillAssessmentGuide.vue';
import { computed } from 'vue';
const {rows, loading, error, savingSkillId, setLevel, query, update, search, searchInput, pagination} = useUserSkills();
const sortKey = computed(() => query.value.sortBy);
const sortDescending = computed(() => query.value.sortOrder === 'desc');
function sortBy(key: 'name' | 'category' | 'level'): void {
  update({sortBy: key, sortOrder: sortKey.value === key
    ? (sortDescending.value ? 'asc' : 'desc') : (key === 'level' ? 'desc' : 'asc')});
}
</script>
<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">My Skills</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Assess your current proficiency to identify gaps
        between your skills and job requirements.
      </p>
    </div>
    <div v-if="error" class="rounded-md border border-destructive/30 bg-destructive/5 p-4">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>
    <SkillListControls :query="query" :pagination="pagination" :search-input="searchInput" @search="search" @update="update" />
    <SkillAssessmentTable
      :rows="rows"
      :sort-key="sortKey"
      :sort-descending="sortDescending"
      @sort="sortBy"
      :loading="loading"
      :saving-skill-id="savingSkillId"
      :set-level="setLevel"
    />
    <SkillAssessmentGuide />
  </section>
</template>
