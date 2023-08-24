import { createApp } from 'vue'
import App from './App.vue'
import { configManager } from './services/application-config'
import { authenticationManager } from './services/authentication/AuthenticationManager.js'
import router from './router/index.js'
import vuetify from './plugins/vuetify.js'
import { createPinia } from 'pinia'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

fetch(`${import.meta.env.BASE_URL}app-config.json`)
  .then((res) => res.json())
  .then((data) => {
    configManager.update(data)
    if (configManager.authenticationIsEnabled) {
      authenticationManager.init(configManager.getUserManagerSettings())
    }
    app.use(router)
    app.use(vuetify)
    app.mount('#app')
  })
