import { createRouter, createWebHistory } from 'vue-router';
import SessionsList from '../components/SessionsList.vue';
import SessionDetail from '../components/SessionDetail.vue';

const routes = [
  {
    path: '/',
    name: 'SessionsList',
    component: SessionsList,
  },
  {
    path: '/sessions/:id',
    name: 'SessionDetail',
    component: SessionDetail,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
