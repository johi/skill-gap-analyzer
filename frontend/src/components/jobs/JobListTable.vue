<script setup lang="ts">
import { ExternalLink } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PaginatedJobs } from '@/schemas/job-list';
defineProps<{ jobs: PaginatedJobs['data'] }>();
</script>
<template>
<div class="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Title</TableHead>
              <TableHead>Location</TableHead><TableHead>Interest</TableHead><TableHead>Match</TableHead>
              <TableHead>Status</TableHead><TableHead>Ad</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="job in jobs" :key="job.id">
                <TableCell class="whitespace-nowrap text-muted-foreground">{{ job.dateFound }}</TableCell>
                <TableCell class="font-medium">{{ job.company }}</TableCell>
                <TableCell>
                  <RouterLink class="font-medium hover:underline" :to="{ name: 'job-detail', params: { id: job.id } }">{{ job.title }}</RouterLink>
                </TableCell>
                <TableCell>{{ job.location ?? '—' }}</TableCell>
                <TableCell><Badge v-if="job.interest !== null" variant="secondary">{{ job.interest }}%</Badge><span v-else>—</span></TableCell>
                <TableCell><Badge v-if="job.originalMatch !== null" variant="secondary">{{ job.originalMatch }}%</Badge><span v-else>—</span></TableCell>
                <TableCell><Badge v-if="job.applyStatus" variant="outline">{{ job.applyStatus.replaceAll('_', ' ') }}</Badge><span v-else>—</span></TableCell>
                <TableCell>
                  <a v-if="job.sourceUrl" :href="job.sourceUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-sm underline" :aria-label="`Open original advertisement for ${job.title}`">
                    Open <ExternalLink class="size-3" />
                  </a><span v-else class="text-muted-foreground">—</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
</template>
