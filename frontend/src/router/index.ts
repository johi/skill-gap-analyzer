import {
    createRouter,
    createWebHistory,
} from 'vue-router';

import JobsView from '../views/JobsView.vue';
import SkillsView from '../views/SkillsView.vue';
import UserSkillsView from '../views/UserSkillsView.vue';
import JobDetailView from '../views/JobDetailView.vue';

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
    ],
});

export default router;