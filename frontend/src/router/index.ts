
import {
    createRouter,
    createWebHistory,
} from 'vue-router';

import JobsView from '@/views/JobsView.vue';
import SkillsView from '@/views/SkillsView.vue';
import UserSkillsView from '@/views/UserSkillsView.vue';
import JobDetailView from '@/views/JobDetailView.vue';
import CreateJobView from '@/views/CreateJobView.vue';
import EditJobView from '@/views/EditJobView.vue';
import ImportJobsView from '@/views/ImportJobsView.vue';
import AnalyzeJobView from '@/views/AnalyzeJobView.vue';
import SkillDemandView from '@/views/SkillDemandView.vue';

const router = createRouter({
    history: createWebHistory(),

    routes: [
        {
            path: '/',
            redirect: '/jobs',
        },
        {
            path: '/jobs',
            name: 'jobs',
            component: JobsView,
        },
        {
            path: '/jobs/new',
            name: 'job-create',
            component: CreateJobView,
        },
        {
            path: '/jobs/import',
            name: 'job-import',
            component: ImportJobsView,
        },
        {
            path: '/jobs/analyze',
            name: 'job-analyze',
            component: AnalyzeJobView,
        },
        {
            path: '/jobs/:id/edit',
            name: 'job-edit',
            component: EditJobView,
        },
        {
            path: '/jobs/:id',
            name: 'job-detail',
            component: JobDetailView,
        },
        {
            path: '/skills',
            name: 'skills',
            component: SkillsView,
        },
        {
            path: '/my-skills',
            name: 'user-skills',
            component: UserSkillsView,
        },
        {
            path: '/skill-demand',
            name: 'skill-demand',
            component: SkillDemandView,
        },
    ],
});

export default router;
