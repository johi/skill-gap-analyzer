<script setup lang="ts">
import { Pencil, Plus, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

defineProps<{
  name: string;
  category: string;
  editingId: number | null;
  saving: boolean;
  error: string | null;
  validationErrors: string[];
}>();

const emit = defineEmits<{
  'update:name': [value: string];
  'update:category': [value: string];
  submit: [];
  cancel: [];
}>();
</script>

<template>
  <Card class="h-fit lg:sticky lg:top-8">
    <CardHeader>
      <CardTitle>{{ editingId === null ? 'Create skill' : 'Edit skill' }}</CardTitle>
      <CardDescription>{{ editingId === null ? 'Add a skill to the catalogue.' : 'Update the selected skill.' }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="error" class="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <p class="text-sm text-destructive">{{ error }}</p>
      </div>
      <div v-if="validationErrors.length" class="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
        <ul class="list-disc space-y-1 pl-4 text-sm text-destructive">
          <li v-for="validationError in validationErrors" :key="validationError">{{ validationError }}</li>
        </ul>
      </div>
      <form class="space-y-4" @submit.prevent="emit('submit')">
        <div class="space-y-2">
          <Label for="skill-name">Name</Label>
          <Input id="skill-name" :model-value="name" type="text" placeholder="e.g. TypeScript" required @update:model-value="emit('update:name', String($event))" />
        </div>
        <div class="space-y-2">
          <Label for="skill-category">Category</Label>
          <Input id="skill-category" :model-value="category" type="text" placeholder="e.g. Language" required @update:model-value="emit('update:category', String($event))" />
        </div>
        <div class="flex flex-wrap gap-2 pt-2">
          <Button type="submit" :disabled="saving">
            <Plus v-if="editingId === null" class="size-4" />
            <Pencil v-else class="size-4" />
            {{ saving ? 'Saving...' : editingId === null ? 'Create skill' : 'Save changes' }}
          </Button>
          <Button v-if="editingId !== null" type="button" variant="outline" :disabled="saving" @click="emit('cancel')">
            <X class="size-4" /> Cancel
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
