<script setup lang="ts">
import { Pencil, Plus, Trash2 } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Skill } from '@/types/skill';

defineProps<{
  skills: Skill[];
  loading: boolean;
  editingId: number | null;
  deletingId: number | null;
}>();

const emit = defineEmits<{
  edit: [skill: Skill];
  delete: [skill: Skill];
}>();
</script>

<template>
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle>Existing skills</CardTitle>
      <CardDescription>Skills available throughout the analyzer.</CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="loading" class="space-y-3">
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
        <Skeleton class="h-10 w-full" />
      </div>
      <div v-else-if="skills.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
        <div class="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <Plus class="size-5 text-muted-foreground" />
        </div>
        <h2 class="font-medium">No skills yet</h2>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">Create your first skill using the form.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="skill in skills" :key="skill.id" :class="{ 'bg-muted/40': editingId === skill.id }">
              <TableCell class="font-medium">{{ skill.name }}</TableCell>
              <TableCell><Badge variant="secondary">{{ skill.category }}</Badge></TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="sm" :disabled="deletingId === skill.id" @click="emit('edit', skill)">
                    <Pencil class="size-4" /> Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" :disabled="deletingId === skill.id" @click="emit('delete', skill)">
                    <Trash2 class="size-4" /> {{ deletingId === skill.id ? 'Deleting...' : 'Delete' }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
