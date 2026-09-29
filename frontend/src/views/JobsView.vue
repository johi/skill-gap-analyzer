<script setup lang="ts">
import {
  onMounted,
  ref,
} from 'vue';

import { getJobs } from '../api/jobs';
import type { Job } from '../types/job';

const jobs = ref<Job[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    jobs.value = await getJobs();
  } catch (err) {
    error.value = err instanceof Error
        ? err.message
        : 'Unable to load jobs';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section>
    <h1>Jobs</h1>

    <p v-if="loading">
      Loading jobs...
    </p>

    <p v-else-if="error">
      {{ error }}
    </p>

    <p v-else-if="jobs.length === 0">
      No jobs found.
    </p>

    <table v-else>
      <thead>
      <tr>
        <th>Date</th>
        <th>Company</th>
        <th>Title</th>
        <th>Location</th>
        <th>Interest</th>
        <th>Status</th>
      </tr>
      </thead>

      <tbody>
      <tr
          v-for="job in jobs"
          :key="job.id"
      >
        <td>{{ job.dateFound }}</td>
        <td>{{ job.company }}</td>
        <td>{{ job.title }}</td>
        <td>{{ job.location ?? '—' }}</td>
        <td>
          {{ job.interest !== null
            ? `${job.interest}%`
            : '—'
          }}
        </td>
        <td>{{ job.applyStatus ?? '—' }}</td>
      </tr>
      </tbody>
    </table>
  </section>
</template>