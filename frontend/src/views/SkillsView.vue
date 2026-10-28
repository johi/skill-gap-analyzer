<script setup lang="ts">
import SkillCatalogue from '@/components/skills/SkillCatalogue.vue';
import SkillEditor from '@/components/skills/SkillEditor.vue';
import { useSkills } from '@/composables/useSkills';
import type { Skill } from '@/types/skill';
import { ref, computed, watch, onUnmounted } from 'vue';
import { mergeSkills, getSkillsPage } from '@/api/skills';
import SkillListControls from '@/components/ui/SkillListControls.vue';

const {
  skills, loading, saving, deletingId, error, validationErrors,
  query, update, search, searchInput, pagination, loadSkills,
  editingId, form, startEdit, cancelEdit, handleSubmit, removeSkill,
} = useSkills();

const selectedIds = ref<number[]>([]);
const targetId = ref<number | null>(null);
const merging = ref(false);
const mergeError = ref('');
const allTargets = ref<Skill[]>([]);
const targetSearch = ref('');
const targetName = ref('');
const targets = computed(() => allTargets.value.filter(skill => !selectedIds.value.includes(skill.id)));
let targetSequence = 0;
let targetTimer: ReturnType<typeof setTimeout> | undefined;
async function loadTargets() {
  const sequence = ++targetSequence;
  try {
    const response = await getSkillsPage({search: targetSearch.value, page:1, pageSize:50, sortBy:'name', sortOrder:'asc'});
    if (sequence === targetSequence) {
      allTargets.value = response.data;
      mergeError.value = '';
    }
  } catch (err) {if (sequence === targetSequence) mergeError.value = err instanceof Error ? err.message : 'Unable to load merge targets';}
}
watch(targetSearch, () => {
  if (targetTimer) clearTimeout(targetTimer);
  targetTimer = setTimeout(loadTargets, 300);
}, {immediate:true});
onUnmounted(() => {if (targetTimer) clearTimeout(targetTimer); targetSequence++;});

function onTargetChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  targetId.value = value ? Number(value) : null;
  targetName.value = allTargets.value.find(skill => skill.id === targetId.value)?.name ?? '';
}

function toggleSkill(id: number): void {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(item => item !== id)
    : [...selectedIds.value, id];
  if (targetId.value !== null && selectedIds.value.includes(targetId.value)) {
    targetId.value = null;
    targetName.value = '';
  }
}

async function handleMerge(): Promise<void> {
  if (merging.value || selectedIds.value.length === 0 || targetId.value === null) return;
  if (!targetName.value) return;
  if (!window.confirm(`Merge ${selectedIds.value.length} selected skill(s) into "${targetName.value}"? Source skills and their proficiency assessments will be deleted.`)) return;
  merging.value = true;
  mergeError.value = '';
  try {
    await mergeSkills(selectedIds.value, targetId.value);
    selectedIds.value = [];
    targetId.value = null;
    targetName.value = '';
    await loadTargets();
    await loadSkills();
  } catch (error) {
    mergeError.value = error instanceof Error ? error.message : 'Skill merge failed';
  } finally {merging.value = false;}
}

async function handleDelete(skill: Skill): Promise<void> {
  if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
  await removeSkill(skill);
  selectedIds.value = selectedIds.value.filter(id => id !== skill.id);
  await loadTargets();
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Skills</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Manage the skill catalogue used to analyze job requirements and assess your own proficiency.
      </p>
    </div>
    <SkillListControls :query="query" :pagination="pagination" :search-input="searchInput" @search="search" @update="update" />
    <div class="flex items-center gap-2 text-sm">
      <span>Sort:</span>
      <select :value="query.sortBy" aria-label="Sort skills" class="rounded border bg-background p-2" @change="update({sortBy: ($event.target as HTMLSelectElement).value})">
        <option value="name">Name</option><option value="category">Category</option>
      </select>
      <button type="button" class="rounded border p-2" @click="update({sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc'})">{{ query.sortOrder === 'asc' ? 'Ascending' : 'Descending' }}</button>
    </div>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
      <SkillCatalogue
        :skills="skills"
        :selected-ids="selectedIds"
        @toggle="toggleSkill"
        :loading="loading"
        :editing-id="editingId"
        :deleting-id="deletingId"
        @edit="startEdit"
        @delete="handleDelete"
      />
      <div class="space-y-4">
        <div class="rounded-lg border p-4 space-y-3">
          <h2 class="font-semibold">Merge skills</h2>
          <p class="text-sm text-muted-foreground">Select source skills using the checkboxes, then choose a target to keep.</p>
          <label for="merge-target-search" class="block text-sm font-medium">Find merge target</label>
          <input id="merge-target-search" v-model="targetSearch" placeholder="Search all skills" class="w-full rounded-md border bg-background p-2" />
          <label for="merge-target" class="block text-sm font-medium">Target skill</label>
          <select id="merge-target" :value="targetId ?? ''" @change="onTargetChange" class="w-full rounded-md border bg-background p-2" :disabled="selectedIds.length === 0 || merging">
            <option :value="null">Select target</option>
            <option v-for="skill in targets" :key="skill.id" :value="skill.id">{{ skill.name }}</option>
          </select>
          <p v-if="mergeError" role="alert" class="text-sm text-destructive">{{ mergeError }}</p>
          <button type="button" class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" :disabled="selectedIds.length === 0 || targetId === null || merging" @click="handleMerge">
            {{ merging ? 'Merging...' : `Merge ${selectedIds.length} selected` }}
          </button>
        </div>
      <SkillEditor
        :name="form.name"
        :category="form.category"
        :editing-id="editingId"
        :saving="saving"
        :error="error"
        :validation-errors="validationErrors"
        @update:name="form.name = $event"
        @update:category="form.category = $event"
        @submit="handleSubmit"
        @cancel="cancelEdit"
      />
      </div>
    </div>
  </section>
</template>
