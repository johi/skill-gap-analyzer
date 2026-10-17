<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { CheckCircle2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { JobImportCommitResponse } from '@/schemas/job-import';
defineProps<{ result: JobImportCommitResponse }>();
</script>

<template>
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <CheckCircle2 class="size-5 text-green-600" />
          Import completed
        </CardTitle>
        <CardDescription>
          The reviewed dataset was committed successfully.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <p>
          <strong>{{ result.imported }}</strong>
          jobs imported.
        </p>
        <p>
          <strong>{{ result.excluded }}</strong>
          jobs excluded.
        </p>
        <p class="text-sm text-muted-foreground">
          This import has been completed. Select another file
          to begin a new import.
        </p>
        <Button variant="outline" as-child>
          <RouterLink to="/jobs">
            View jobs
          </RouterLink>
        </Button>
      </CardContent>
    </Card>
</template>
