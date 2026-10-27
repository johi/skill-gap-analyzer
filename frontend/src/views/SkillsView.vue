<script setup lang="ts">
import SkillCatalogue from '@/components/skills/SkillCatalogue.vue';
import SkillEditor from '@/components/skills/SkillEditor.vue';
import { useSkills } from '@/composables/useSkills';
import type { Skill } from '@/types/skill';
import { ref, computed } from 'vue';
import { mergeSkills } from '@/api/skills';

const {
  skills, loading, saving, deletingId, error, validationErrors,
  editingId, form, startEdit, cancelEdit, handleSubmit, removeSkill,
} = useSkills();

const selectedIds = ref<number[]>([]);
const targetId = ref<number | null>(null);
const merging = ref(false);
const mergeError = ref('');
const targets = computed(() => skills.value.filter(skill => !selectedIds.value.includes(skill.id)));

function toggleSkill(id: number): void {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(item => item !== id)
    : [...selectedIds.value, id];
  if (targetId.value !== null && selectedIds.value.includes(targetId.value)) {
    targetId.value = null;
  }
}

async function handleMerge(): Promise<void> {
  if (merging.value || selectedIds.value.length === 0 || targetId.value === null) return;
  const target = skills.value.find(skill => skill.id === targetId.value);
  if (!target) return;
  if (!window.confirm(`Merge ${selectedIds.value.length} selected skill(s) into "${target.name}"? Source skills and their proficiency assessments will be deleted.`)) return;
  merging.value = true;
  mergeError.value = '';
  try {
    await mergeSkills(selectedIds.value, targetId.value);
    window.location.reload();
  } catch (error) {
    mergeError.value = error instanceof Error ? error.message : 'Skill merge failed';
    merging.value = false;
  }
}

async function handleDelete(skill: Skill): Promise<void> {
  if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
  await removeSkill(skill);
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
          <label for="merge-target" class="block text-sm font-medium">Target skill</label>
          <select id="merge-target" v-model.number="targetId" class="w-full rounded-md border bg-background p-2" :disabled="selectedIds.length === 0 || merging">
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
