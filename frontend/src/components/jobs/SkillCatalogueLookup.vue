<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Skill } from '@/types/skill';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const props = defineProps<{
  skills: Skill[];
  inputId: string;
}>();
const emit = defineEmits<{ select: [skill: Skill] }>();
const query = ref('');
const matches = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('en');
  if (!needle) return [];
  return props.skills.filter(skill =>
    skill.name.toLocaleLowerCase('en').includes(needle) ||
    skill.category.toLocaleLowerCase('en').includes(needle)
  ).slice(0, 12);
});

function choose(skill: Skill) {
  emit('select', skill);
  query.value = '';
}
</script>

<template>
  <div class="space-y-2">
    <label :for="inputId" class="text-sm font-medium">Replace with existing skill</label>
    <Input :id="inputId" v-model="query" type="search" placeholder="Search skill catalogue by name or category…" />
    <div v-if="query.trim()" class="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2" role="listbox" :aria-label="`Existing skills for ${inputId}`">
      <p v-if="matches.length === 0" class="p-2 text-sm text-muted-foreground">No matching skills. You can edit the skill manually.</p>
      <Button
        v-for="skill in matches"
        :key="skill.id"
        type="button"
        variant="ghost"
        size="sm"
        class="w-full justify-start text-left"
        :aria-label="`Use existing skill ${skill.name}`"
        @click="choose(skill)"
      >
        {{ skill.name }} <span class="ml-2 text-xs text-muted-foreground">({{ skill.category }})</span>
      </Button>
      <p v-if="matches.length === 12" class="px-2 text-xs text-muted-foreground">Showing the first 12 matches; refine your search.</p>
    </div>
  </div>
</template>
