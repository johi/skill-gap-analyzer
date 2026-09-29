<script setup lang="ts">
import {
  onMounted,
  ref,
} from 'vue';
import {
  RouterLink,
  useRoute,
} from 'vue-router';

import { getJob } from '../api/jobs';
import { ApiError } from '../api/client';

import type { JobWithSkills } from '../types/job';

const route = useRoute();

const job = ref<JobWithSkills | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const id = Number(route.params.id);

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
</script>

<template>
  <section>
    <p>
      <RouterLink to="/jobs">
        ← Back to jobs
      </RouterLink>
    </p>

    <p v-if="loading">
      Loading job...
    </p>

    <p v-else-if="error">
      {{ error }}
    </p>

    <template v-else-if="job">
      <h1>{{ job.title }}</h1>
      <p>
        <RouterLink
            :to="{
            name: 'job-edit',
            params: {
                id: job.id,
            },
        }"
        >
          Edit job
        </RouterLink>
      </p>
      <dl>
        <dt>Company</dt>
        <dd>{{ job.company }}</dd>

        <dt>Date found</dt>
        <dd>{{ job.dateFound }}</dd>

        <dt>Location</dt>
        <dd>{{ job.location ?? '—' }}</dd>

        <dt>Work model</dt>
        <dd>{{ job.workModel ?? '—' }}</dd>

        <dt>Employment type</dt>
        <dd>{{ job.employmentType ?? '—' }}</dd>

        <dt>Seniority</dt>
        <dd>{{ job.seniority ?? '—' }}</dd>

        <dt>Primary role</dt>
        <dd>{{ job.primaryRole ?? '—' }}</dd>

        <dt>Years required</dt>
        <dd>{{ job.yearsRequired ?? '—' }}</dd>

        <dt>Education requirement</dt>
        <dd>{{ job.educationRequirement ?? '—' }}</dd>

        <dt>Danish required</dt>
        <dd>{{ job.danishRequired ?? '—' }}</dd>

        <dt>Salary</dt>
        <dd>{{ job.salaryRate ?? '—' }}</dd>

        <dt>Interest</dt>
        <dd>
          {{
            job.interest !== null
                ? `${job.interest}%`
                : '—'
          }}
        </dd>

        <dt>Application status</dt>
        <dd>{{ job.applyStatus ?? '—' }}</dd>

        <dt>Original match</dt>
        <dd>
          {{
            job.originalMatch !== null
                ? `${job.originalMatch}%`
                : '—'
          }}
        </dd>
      </dl>

      <h2>Skills</h2>

      <p v-if="job.skills.length === 0">
        No skills assigned.
      </p>

      <table v-else>
        <thead>
        <tr>
          <th>Skill</th>
          <th>Category</th>
          <th>Requirement</th>
        </tr>
        </thead>

        <tbody>
        <tr
            v-for="skill in job.skills"
            :key="skill.id"
        >
          <td>{{ skill.name }}</td>
          <td>{{ skill.category }}</td>
          <td>{{ skill.requirement }}</td>
        </tr>
        </tbody>
      </table>

      <h2>Gap notes</h2>
      <p>{{ job.gapNotes ?? '—' }}</p>

      <h2>Original text</h2>
      <p>{{ job.originalText ?? '—' }}</p>

      <p v-if="job.sourceUrl">
        <a
            :href="job.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
        >
          Original job advertisement
        </a>
      </p>
    </template>
  </section>
</template>