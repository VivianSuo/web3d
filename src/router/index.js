import Vue from "vue";
import Router from "vue-router";
import HelloWorld from "@/components/HelloWorld";
import OutLineComposer from "@/components/outlineComposer";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "HelloWorld",
      component: HelloWorld,
    },
    {
      path: "/outLine",
      name: "outLine",
      component: OutLineComposer,
    },
  ],
});
