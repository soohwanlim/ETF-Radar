import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')
window.__ETF_RADAR_BOOTED__ = true

async function bootstrap() {
  try {
    const { default: App } = await import('./App.jsx')
    rootElement.innerHTML = ''

    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    console.error('ETF Radar app bootstrap failed', error)
    rootElement.innerHTML = `
      <main class="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div class="max-w-md">
          <p class="text-lg font-extrabold text-slate-950">페이지를 불러오지 못했습니다.</p>
          <p class="mt-2 text-sm leading-relaxed text-slate-600">방금 배포된 파일을 다시 연결하는 중일 수 있습니다. 잠시 후 새로고침해 주세요.</p>
          <button type="button" class="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500" data-retry-app>새로고침</button>
        </div>
      </main>
    `
    rootElement.querySelector('[data-retry-app]')?.addEventListener('click', () => window.location.reload())
  }
}

bootstrap()
