import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'

const API_BASE = 'http://localhost:8080'
let goStarted = false

// Ensure Go backend is running - auto-start if needed
async function ensureGoRunning() {
  // Try a quick health check first
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(1000) })
    if (res.ok) return true
  } catch {}

  // Go is down - try to start it
  if (!goStarted) {
    goStarted = true
    console.log('[API] Go backend down, auto-starting...')
    exec('cd /home/z/my-project/backend && setsid nohup ./avex-api > /tmp/avex-api.log 2>&1 < /dev/null &', (err) => {
      if (err) console.error('[API] Failed to start Go:', err)
    })
    // Wait for it to start
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500))
      try {
        const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(1000) })
        if (res.ok) { console.log('[API] Go backend started!'); return true }
      } catch {}
    }
    console.error('[API] Go backend failed to start')
  }
  return false
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'GET')
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'POST')
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'PUT')
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'PATCH')
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'DELETE')
}

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>, method: string) {
  const { path: pathArr } = await params
  const pathStr = pathArr.join('/')

  const url = new URL(req.url)
  url.searchParams.delete('XTransformPort')
  const queryString = url.searchParams.toString()

  const targetUrl = `${API_BASE}/api/${pathStr}${queryString ? '?' + queryString : ''}`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const authHeader = req.headers.get('authorization')
  if (authHeader) headers['Authorization'] = authHeader

  let body: string | undefined
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    body = await req.text()
  }

  // Ensure Go is running before making request
  await ensureGoRunning()

  try {
    const response = await fetch(targetUrl, { method, headers, body, signal: AbortSignal.timeout(10000) })
    const contentType = response.headers.get('content-type') || 'application/json'
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', contentType)
    const auth = response.headers.get('authorization')
    if (auth) responseHeaders.set('Authorization', auth)
    const data = await response.text()
    return new NextResponse(data, { status: response.status, headers: responseHeaders })
  } catch {
    return NextResponse.json({ error: 'خدمة الـ API غير متاحة حالياً. يرجى المحاولة مرة أخرى.' }, { status: 503 })
  }
}
