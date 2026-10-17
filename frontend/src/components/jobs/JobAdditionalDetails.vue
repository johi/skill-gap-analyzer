<script setup lang="ts">
import type { JobWithSkills } from '@/types/job';
import { ExternalLink } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{ job: JobWithSkills }>();
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>Gap notes</CardTitle>
      </CardHeader>

      <CardContent>
        <p class="whitespace-pre-wrap text-sm leading-relaxed">
          {{ job.gapNotes ?? '—' }}
        </p>
      </CardContent>
    </Card>

    <Card v-if="job.sourceUrl" class="h-fit">
      <CardHeader>
        <CardTitle>Source</CardTitle>

        <CardDescription>
          View the original job advertisement.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button variant="outline" as-child>
          <a
              :href="job.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
          >
            <ExternalLink class="size-4" />
            Original job advertisement
          </a>
        </Button>
      </CardContent>
    </Card>
  </div>

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
