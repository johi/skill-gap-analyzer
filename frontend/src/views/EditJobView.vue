<script setup lang="ts">
import {
  onMounted,
  ref,
} from 'vue';

import {
  RouterLink,
  useRoute,
  useRouter,
} from 'vue-router';

import JobForm from '../components/JobForm.vue';

import {
  getJob,
  updateJob,
} from '../api/jobs';

import { ApiError } from '../api/client';

import type {
  CreateJobInput,
  JobWithSkills,
} from '../types/job';

const route = useRoute();
const router = useRouter();

const job = ref<JobWithSkills | null>(null);
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);
const validationErrors = ref<string[]>([]);

const id = Number(route.params.id);

onMounted(async () => {
  if (!Number.isInteger(id) || id <= 0) {
    error.value = 'Invalid job ID';
    loading.value = false;

    return;
  }

  try {
    job.value = await getJob(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      error.value = 'Job not found';
    } else {
      error.value = err instanceof Error
          ? err.message
          : 'Unable to load job';
    }
  } finally {
    loading.value = false;
  }
});

async function handleSubmit(
    input: CreateJobInput
): Promise<void> {
  submitting.value = true;
  error.value = null;
  validationErrors.value = [];

  try {
    const updated = await updateJob(id, input);

    await router.push({
      name: 'job-detail',
      params: {
        id: updated.id,
      },
    });
  } catch (err) {
    if (
        err instanceof ApiError &&
        err.error === 'validation_error'
    ) {
      validationErrors.value = err.issues.map(
          (issue) =>
              issue.path
                  ? `${issue.path}: ${issue.message}`
                  : issue.message
      );

      return;
    }

    error.value = err instanceof Error
        ? err.message
        : 'Unable to update job';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section>
    <p>
      <RouterLink
          v-if="job"
          :to="{
                    name: 'job-detail',
                    params: {
                        id: job.id,
                    },
                }"
      >
        ← Back to job
      </RouterLink>

      <RouterLink
          v-else
          to="/jobs"
      >
        ← Back to jobs
      </RouterLink>
    </p>

    <h1>Edit job</h1>

    <p v-if="loading">
      Loading job...
    </p>

    <p v-else-if="error">
      {{ error }}
    </p>

    <template v-else-if="job">
      <ul v-if="validationErrors.length">
        <li
            v-for="validationError in validationErrors"
            :key="validationError"
        >
          {{ validationError }}
        </li>
      </ul>

      <JobForm
          :initial-value="job"
          :submitting="submitting"
          @submit="handleSubmit"
      />
    </template>
  </section>
</template>