import Vue from "vue";
import Router from "vue-router";
import HelloWorld from "@/components/HelloWorld";
import home from "@/components/home";
import OutLineComposer from "@/components/outlineComposer";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "home",
      component: home,
    },
    {
      path: "/outLine",
      name: "outLine",
      component: OutLineComposer,
    },
  ],
});
