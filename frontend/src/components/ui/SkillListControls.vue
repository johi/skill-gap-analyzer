<script setup lang="ts">
import type { Pagination, ListQuery } from '@/schemas/list-pagination';
import { Button } from '@/components/ui/button';
const props = defineProps<{query: ListQuery; pagination: Pagination | null; searchInput: string}>();
const emit = defineEmits<{search: [value: string]; update: [changes: Partial<ListQuery>, reset: boolean]}>();
</script>
<template>
  <div class="flex flex-wrap gap-3 items-center justify-between">
    <input :value="searchInput" aria-label="Search skills" placeholder="Search skills..." class="rounded-md border bg-background px-3 py-2 text-sm" @input="emit('search', ($event.target as HTMLInputElement).value)" />
    <label class="text-sm">Page size
      <select :value="query.pageSize" class="ml-2 rounded-md border bg-background p-2" @change="emit('update', {pageSize: Number(($event.target as HTMLSelectElement).value)}, true)">
        <option v-for="size in [10,25,50]" :key="size" :value="size">{{ size }}</option>
      </select>
    </label>
  </div>
  <div v-if="pagination" class="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
    <span>{{ pagination.totalItems }} matching skills</span>
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" :disabled="pagination.page <= 1" @click="emit('update', {page: pagination.page - 1}, false)">Previous</Button>
      <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
      <Button variant="outline" size="sm" :disabled="pagination.page >= pagination.totalPages" @click="emit('update', {page: pagination.page + 1}, false)">Next</Button>
    </div>
  </div>
</template>
