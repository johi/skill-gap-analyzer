<script setup lang="ts">
import type { JobWithSkills } from '@/types/job';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{ job: JobWithSkills }>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Original job posting</CardTitle>

      <CardDescription>
        Original text retained for reference and later analysis.
      </CardDescription>
    </CardHeader>

    <CardContent>
      <p class="whitespace-pre-wrap text-sm leading-relaxed">
        {{ job.originalText ?? '—' }}
      </p>
    </CardContent>
  </Card>
</template>
