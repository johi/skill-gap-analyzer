<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type { JobListQuery, PaginatedJobs } from '@/schemas/job-list';
defineProps<{ filters: JobListQuery; pagination: PaginatedJobs['pagination']; startItem: number; endItem: number; totalPages: number }>();
const emit = defineEmits<{ page: [page: number] }>();
</script>
<template>
<div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p class="text-sm text-muted-foreground">
            Showing {{ startItem }}–{{ endItem }} of {{ pagination.totalItems }} jobs
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="filters.page <= 1" @click="emit('page', filters.page - 1)">Previous</Button>
            <span class="text-sm">Page {{ filters.page }} of {{ totalPages }}</span>
            <Button variant="outline" size="sm" :disabled="filters.page >= totalPages" @click="emit('page', filters.page + 1)">Next</Button>
          </div>
        </div>
</template>
