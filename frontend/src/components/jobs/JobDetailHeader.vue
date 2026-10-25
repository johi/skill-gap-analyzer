<script setup lang="ts">
import type { JobWithSkills } from '@/types/job';
import { RouterLink } from 'vue-router';
import { MapPin, Pencil, Trash2 } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

defineProps<{ job: JobWithSkills; deleting: boolean }>();
const emit = defineEmits<{ delete: [] }>();
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <Badge v-if="job.applyStatus" variant="outline">
          {{ job.applyStatus }}
        </Badge>

        <Badge v-if="job.interest !== null" variant="secondary">
          {{ job.interest }}% interest
        </Badge>
      </div>

      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        {{ job.title }}
      </h1>

      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span class="font-medium text-foreground">
                        {{ job.company }}
                    </span>

        <span v-if="job.location" class="flex items-center gap-1">
                        <MapPin class="size-4" />
                        {{ job.location }}
                    </span>
      </div>
    </div>

    <div class="flex shrink-0 gap-2">
      <Button variant="outline" as-child>
        <RouterLink
            :to="{
                            name: 'job-edit',
                            params: { id: job.id },
                        }"
        >
          <Pencil class="size-4" />
          Edit job
        </RouterLink>
      </Button>

      <Button
          type="button"
          variant="destructive"
          :disabled="deleting"
          @click="emit('delete')"
      >
        <Trash2 class="size-4" />
        {{ deleting ? 'Deleting...' : 'Delete job' }}
      </Button>
    </div>
  </div>
</template>
