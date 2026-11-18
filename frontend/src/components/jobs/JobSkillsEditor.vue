<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SkillCatalogueLookup from '@/components/jobs/SkillCatalogueLookup.vue';
import { jobSkillRequirementLabels } from '@/lib/job-labels';
import { categoryKey, normalizeSkillCategory } from '@/services/skill-category';
import type { Skill } from '@/types/skill';
import type { JobSkillRequirement } from '@/types/job';

type EditableSkill = { name: string; category: string; requirement: JobSkillRequirement | '' };

defineProps<{
  skills: EditableSkill[];
  reviewMode?: boolean;
  categoryReview?: boolean;
  skillCatalogue?: Skill[];
  knownCategories: string[];
  approvedCategories: string[];
  matchedSkill: (name: string) => Skill | undefined;
  isNewCategory: (skill: EditableSkill) => boolean;
}>();

const emit = defineEmits<{
  addSkill: [];
  removeSkill: [index: number];
  useExistingSkill: [index: number, skill: Skill];
  replaceCategory: [index: number, category: string];
  acceptCategory: [category: string];
}>();
</script>

<template>
    <section class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold">
            Required skills
          </h2>

          <p class="text-sm text-muted-foreground">
            Skills extracted from the job requirements.
          </p>
        </div>

        <Button
            type="button"
            variant="outline"
            size="sm"
            @click="emit('addSkill')"
        >
          <Plus class="size-4" />
          Add skill
        </Button>
      </div>

      <div
          v-if="skills.length === 0"
          class="rounded-lg border border-dashed p-6 text-center"
      >
        <p class="text-sm text-muted-foreground">
          No skills have been added yet.
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
            v-for="(skill, index) in skills"
            :key="index"
            class="space-y-3 rounded-lg border bg-muted/20 p-4"
        >
          <SkillCatalogueLookup
              v-if="reviewMode"
              :input-id="`skill-lookup-${index}`"
              :skills="skillCatalogue ?? []"
              @select="emit('useExistingSkill', index, $event)"
          />
          <div class="grid gap-3 md:grid-cols-[1fr_1fr_180px] md:items-end">
          <div class="space-y-2">
            <Label :for="`skill-name-${index}`">
              Skill
            </Label>

            <Input
                :id="`skill-name-${index}`"
                v-model="skill.name"
                type="text"
                placeholder="e.g. TypeScript"
                required
            />
          </div>

          <div class="space-y-2">
            <Label :for="`skill-category-${index}`">
              Category
            </Label>

            <Input
                :id="`skill-category-${index}`"
                v-model="skill.category"
                type="text"
                placeholder="e.g. Programming Languages"
                required
            />
            <template v-if="reviewMode || categoryReview">
              <p v-if="matchedSkill(skill.name)" class="text-xs text-muted-foreground">
                Existing skill — canonical category: {{ matchedSkill(skill.name)?.category }}
              </p>
              <p v-else-if="isNewCategory(skill)" class="text-xs font-medium text-amber-700">
                New category: {{ normalizeSkillCategory(skill.category) }}
              </p>
              <p v-else-if="skill.category.trim()" class="text-xs text-muted-foreground">Existing category</p>
              <div v-if="isNewCategory(skill)" class="space-y-2">
                <select
                    :aria-label="`Replace category for ${skill.name}`"
                    class="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    :value="''"
                    @change="emit('replaceCategory', index, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Replace with existing category…</option>
                  <option v-for="category in knownCategories" :key="category" :value="category">{{ category }}</option>
                </select>
                <Button
                    v-if="reviewMode && !approvedCategories.includes(categoryKey(skill.category))"
                    type="button" variant="default" size="sm"
                    :aria-label="`Accept new category ${normalizeSkillCategory(skill.category)}`"
                    @click="emit('acceptCategory', skill.category)"
                >Accept new category</Button>
                <p v-else-if="reviewMode" class="text-xs text-green-700">New category accepted</p>
              </div>
            </template>
          </div>

          <div class="space-y-2">
            <Label :for="`skill-requirement-${index}`">
              Requirement
            </Label>

            <select
                :id="`skill-requirement-${index}`"
                v-model="skill.requirement"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option v-if="reviewMode" value="" disabled>Review required</option>
              <option v-for="(label, value) in jobSkillRequirementLabels" :key="value" :value="value">{{ label }}</option>
            </select>
          </div>
          </div>

          <Button
              type="button"
              variant="ghost"
              size="sm"
              @click="emit('removeSkill', index)"
          >
            <Trash2 class="size-4" />
            Remove
          </Button>
        </div>
      </div>
    </section>

</template>
