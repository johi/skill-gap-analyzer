<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { JobImportAnalysis } from '@/schemas/job-import';
defineProps<{ analysis: JobImportAnalysis; includedCount: number; excludedCount: number; skillCounts: { existing: number; new: number; reviewRequired: number } }>();
</script>

<template>
      <Card>
        <CardHeader>
          <CardTitle>Analysis results</CardTitle>
          <CardDescription>
            No jobs have been imported yet.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-md border p-3">
              <p class="text-sm text-muted-foreground">
                Analyzed
              </p>
              <p class="text-2xl font-semibold">
                {{ analysis.totalJobs }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-sm text-muted-foreground">
                Included
              </p>
              <p class="text-2xl font-semibold">
                {{ includedCount }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-sm text-muted-foreground">
                Excluded
              </p>
              <p class="text-2xl font-semibold">
                {{ excludedCount }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-sm">
                        <span class="rounded-md bg-muted px-3 py-2">
                            Existing skills: {{ skillCounts.existing }}
                        </span>
            <span class="rounded-md bg-muted px-3 py-2">
                            New skills: {{ skillCounts.new }}
                        </span>
            <span
                class="rounded-md px-3 py-2"
                :class="
                                skillCounts.reviewRequired
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted'
                            "
            >
                            Skills requiring review:
                            {{ skillCounts.reviewRequired }}
                        </span>
          </div>
        </CardContent>
      </Card>
</template>
