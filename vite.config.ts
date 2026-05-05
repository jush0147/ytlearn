import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({plugins:[react()],server:{proxy:{'/api/timedtext':{target:'https://www.youtube.com',changeOrigin:true,rewrite:(p)=>p.replace('/api/timedtext','/api/timedtext')}}}})
