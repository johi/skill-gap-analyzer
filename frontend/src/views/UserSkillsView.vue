<script setup lang="ts">
import {useUserSkills} from '@/composables/useUserSkills';
import SkillAssessmentTable from '@/components/user-skills/SkillAssessmentTable.vue';
import SkillListControls from '@/components/ui/SkillListControls.vue';
import SkillAssessmentGuide from '@/components/user-skills/SkillAssessmentGuide.vue';
const {rows, loading, error, savingSkillId, setLevel, query, update, search, searchInput, pagination} = useUserSkills();
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
    <div class="flex items-center gap-2 text-sm">Sort:
      <select :value="query.sortBy" class="rounded border bg-background p-2" aria-label="Sort assessments" @change="update({sortBy: ($event.target as HTMLSelectElement).value})">
        <option value="name">Name</option><option value="category">Category</option><option value="level">Proficiency</option>
      </select>
      <button class="rounded border p-2" @click="update({sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc'})">{{ query.sortOrder === 'asc' ? 'Ascending' : 'Descending' }}</button>
    </div>
    <SkillAssessmentTable
      :rows="rows"
      :loading="loading"
      :saving-skill-id="savingSkillId"
      :set-level="setLevel"
    />
    <SkillAssessmentGuide />
  </section>
</template>
