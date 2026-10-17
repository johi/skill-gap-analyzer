<script setup lang="ts">
import {
  onMounted,
  ref,
} from 'vue';

import {
  RouterLink,
  useRoute,
} from 'vue-router';

import JobForm from '../components/JobForm.vue';

import {
  getJob,
  updateJob,
} from '../api/jobs';

import { ApiError } from '../api/client';

import type { JobWithSkills } from '../types/job';
import { useJobFormSubmit } from '@/composables/useJobFormSubmit';
import { ArrowLeft } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';

const route = useRoute();

const job = ref<JobWithSkills | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);

const id = Number(route.params.id);
const { submitting, error, validationErrors, handleSubmit } =
  useJobFormSubmit((input) => updateJob(id, input), 'Unable to update job');

onMounted(async () => {
  if (!Number.isInteger(id) || id <= 0) {
    loadError.value = 'Invalid job ID';
    loading.value = false;

    return;
  }

  try {
    job.value = await getJob(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      loadError.value = 'Job not found';
    } else {
      loadError.value = err instanceof Error
          ? err.message
          : 'Unable to load job';
    }
  } finally {
    loading.value = false;
  }
});

</script>

<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink
          v-if="job"
          :to="{
                    name: 'job-detail',
                    params: { id: job.id },
                }"
      >
        <ArrowLeft class="size-4" />
        Back to job
      </RouterLink>

      <RouterLink
          v-else
          to="/jobs"
      >
        <ArrowLeft class="size-4" />
        Back to jobs
      </RouterLink>
    </Button>

    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Edit job
      </h1>

      <p class="mt-1 text-sm text-muted-foreground">
        Update the opportunity, requirements and your assessment.
      </p>
    </div>

    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-8 w-1/3" />
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <div
        v-else-if="loadError && !job"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="text-sm text-destructive">
        {{ loadError }}
      </p>
    </div>

    <template v-else-if="job">
      <div
          v-if="error"
          class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
      >
        <p class="text-sm text-destructive">{{ error }}</p>
      </div>
      <div
          v-if="validationErrors.length"
          class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
      >
        <p class="mb-2 text-sm font-medium text-destructive">
          Please correct the following:
        </p>

        <ul class="list-disc space-y-1 pl-5 text-sm text-destructive">
          <li
              v-for="validationError in validationErrors"
              :key="validationError"
          >
            {{ validationError }}
          </li>
        </ul>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>

          <CardDescription>
            Editing {{ job.title }} at {{ job.company }}.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <JobForm
              :initial-value="job"
              :submitting="submitting"
              submit-label="Save changes"
              @submit="handleSubmit"
          />
        </CardContent>
      </Card>
    </template>
  </section>
</template>