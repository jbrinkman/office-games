import "@fontsource/anton/400.css"
import "@fontsource/oswald/500.css"
import "@fontsource/oswald/600.css"
import "@fontsource/oswald/700.css"
import "@fontsource/libre-baskerville/400.css"
import "@fontsource/libre-baskerville/700.css"
import { createApp } from "vue"
import App from "./App.vue"
import { router } from "./router.ts"
import "./styles/base.css"

createApp(App).use(router).mount("#app")
