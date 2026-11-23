import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("./views/HomeView.vue") },
    { path: "/match/:date/:id", name: "match", component: () => import("./views/MatchView.vue") },
    { path: "/stats", name: "stats", component: () => import("./views/StatsView.vue") },
    { path: "/about", name: "about", component: () => import("./views/AboutView.vue") },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("./views/NotFoundView.vue") },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
