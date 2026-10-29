<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import JobDetailHeader from '@/components/jobs/JobDetailHeader.vue';
import JobPositionDetails from '@/components/jobs/JobPositionDetails.vue';
import JobAssessment from '@/components/jobs/JobAssessment.vue';
import JobMatch from '@/components/jobs/JobMatch.vue';
import JobRecruitmentContacts from '@/components/jobs/JobRecruitmentContacts.vue';
import JobAdditionalDetails from '@/components/jobs/JobAdditionalDetails.vue';
import { useJobDetail } from '@/composables/useJobDetail';

const { job, loading, error, deleting, removeJob } = useJobDetail();

function handleDelete(): void {
  if (!job.value) return;
  if (!window.confirm(`Delete "${job.value.title}" at ${job.value.company}?`)) return;
  void removeJob();
}
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink to="/jobs">
        <ArrowLeft class="size-4" />
        Back to jobs
      </RouterLink>
    </Button>

    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-10 w-2/3" />
      <Skeleton class="h-5 w-1/3" />
      <Skeleton class="h-64 w-full" />
    </div>

    <div v-else-if="error" class="rounded-md border border-destructive/30 bg-destructive/5 p-4">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>

    <template v-else-if="job">
      <JobDetailHeader :job="job" :deleting="deleting" @delete="handleDelete" />

      <div class="grid gap-6 lg:grid-cols-3">
        <JobPositionDetails :job="job" />
        <div class="space-y-6">
          <JobAssessment :job="job" />
          <JobRecruitmentContacts :job="job" />
        </div>
      </div>

      <JobMatch :job-id="job.id" :skills="job.skills" />

      <JobAdditionalDetails :job="job" />
    </template>
  </section>
</template>
