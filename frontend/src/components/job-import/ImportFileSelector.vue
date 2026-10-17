<script setup lang="ts">
import { FileJson, Upload } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { JobDataset } from '@/schemas/job-import';
defineProps<{ selectedFileName: string | null; dataset: JobDataset | null; busy: boolean; analyzing: boolean; completed: boolean }>();
const emit = defineEmits<{ fileChange: [event: Event]; analyze: [] }>();
</script>

<template>
    <Card>
      <CardHeader>
        <CardTitle>Select dataset</CardTitle>
        <CardDescription>
          Choose a version 1 JSON job dataset.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-5">
        <div class="space-y-2">
          <label for="job-import-file" class="text-sm font-medium">
            JSON file
          </label>
          <input
              id="job-import-file"
              type="file"
              accept=".json,application/json"
              class="block w-full rounded-md border p-3 text-sm"
              :disabled="busy"
              @change="emit('fileChange', $event)"
          />
        </div>

        <div
            v-if="dataset"
            class="flex items-center gap-3 rounded-md border p-4"
        >
          <FileJson class="size-5 text-muted-foreground" />
          <div>
            <p class="text-sm font-medium">
              {{ selectedFileName }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ dataset.jobs.length }} jobs in dataset
            </p>
          </div>
        </div>

        <Button
            :disabled="!dataset || busy || completed"
            @click="emit('analyze')"
        >
          <Upload class="size-4" />
          {{ analyzing ? 'Analyzing...' : 'Analyze dataset' }}
        </Button>
      </CardContent>
    </Card>
</template>
