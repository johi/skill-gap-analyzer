<script setup lang="ts">
import { applicationStatusLabels } from '@/lib/job-labels';
import { ExternalLink } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PaginatedJobs } from '@/schemas/job-list';
defineProps<{ jobs: PaginatedJobs['data']; sortKey: string; sortDescending: boolean }>();
const emit = defineEmits<{sort: [key: 'dateFound' | 'applicationDeadline' | 'company' | 'interest' | 'matchPercentage']}>();
</script>
<template>
<div class="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead v-for="column in [{key: 'dateFound', label: 'Date'}, {key: 'applicationDeadline', label: 'Deadline'}, {key: 'company', label: 'Company'}] as const" :key="column.key" :aria-sort="sortKey === column.key ? (sortDescending ? 'descending' : 'ascending') : 'none'">
                <button type="button" class="hover:underline" @click="emit('sort', column.key)">{{ column.label }}{{ sortKey === column.key ? (sortDescending ? ' ↓' : ' ↑') : '' }}</button>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Location</TableHead>
              <TableHead v-for="column in [{key: 'interest', label: 'Interest'}, {key: 'matchPercentage', label: 'Calculated match'}] as const" :key="column.key" :aria-sort="sortKey === column.key ? (sortDescending ? 'descending' : 'ascending') : 'none'">
                <button type="button" class="hover:underline" @click="emit('sort', column.key)">{{ column.label }}{{ sortKey === column.key ? (sortDescending ? ' ↓' : ' ↑') : '' }}</button>
              </TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Status</TableHead><TableHead>Ad</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="job in jobs" :key="job.id">
                <TableCell class="whitespace-nowrap text-muted-foreground">{{ job.dateFound }}</TableCell>
                <TableCell class="whitespace-nowrap">{{ job.applicationDeadline ?? '—' }}</TableCell>
                <TableCell class="font-medium">{{ job.company }}</TableCell>
                <TableCell>
                  <RouterLink class="font-medium hover:underline" :to="{ name: 'job-detail', params: { id: job.id } }">{{ job.title }}</RouterLink>
                </TableCell>
                <TableCell>{{ job.location ?? '—' }}</TableCell>
                <TableCell><Badge v-if="job.interest !== null" variant="secondary">{{ job.interest }}%</Badge><span v-else>—</span></TableCell>
                <TableCell><Badge v-if="job.matchPercentage !== null" variant="secondary">{{ job.matchPercentage }}%</Badge><span v-else>—</span></TableCell>
                <TableCell><Badge variant="outline">{{ job.assessmentCoverage }}%</Badge></TableCell>
                <TableCell><Badge v-if="job.applyStatus" variant="outline">{{ applicationStatusLabels[job.applyStatus] }}</Badge><span v-else>—</span></TableCell>
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
