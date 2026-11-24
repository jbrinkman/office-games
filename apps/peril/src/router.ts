import { createRouter, createWebHistory } from "vue-router"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./views/HomeView.vue") },
    { path: "/host/new", component: () => import("./views/HostSetupView.vue") },
    { path: "/host/:code", component: () => import("./views/HostConsoleView.vue"), props: true },
    { path: "/g/:code", component: () => import("./views/ViewerView.vue"), props: true },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
})
