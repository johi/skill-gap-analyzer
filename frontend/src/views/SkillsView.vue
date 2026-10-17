<script setup lang="ts">
import SkillCatalogue from '@/components/skills/SkillCatalogue.vue';
import SkillEditor from '@/components/skills/SkillEditor.vue';
import { useSkills } from '@/composables/useSkills';
import type { Skill } from '@/types/skill';

const {
  skills, loading, saving, deletingId, error, validationErrors,
  editingId, form, startEdit, cancelEdit, handleSubmit, removeSkill,
} = useSkills();

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
        :loading="loading"
        :editing-id="editingId"
        :deleting-id="deletingId"
        @edit="startEdit"
        @delete="handleDelete"
      />
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
  </section>
</template>
