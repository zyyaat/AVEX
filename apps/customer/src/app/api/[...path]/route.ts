import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8080'
const REQUEST_TIMEOUT = 15000
const MAX_RETRIES = 2

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'GET')
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'POST')
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'PATCH')
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params, 'PUT')
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

  // Retry logic for transient failures
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(targetUrl, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      })
      const contentType = response.headers.get('content-type') || 'application/json'
      const responseHeaders = new Headers()
      responseHeaders.set('Content-Type', contentType)
      const auth = response.headers.get('authorization')
      if (auth) responseHeaders.set('Authorization', auth)
      const data = await response.text()
      return new NextResponse(data, { status: response.status, headers: responseHeaders })
    } catch (err: any) {
      lastError = err
      // Only retry on network errors (not on HTTP error status codes)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }

  console.error(`[proxy] ${method} ${pathStr} failed after ${MAX_RETRIES + 1} attempts:`, lastError?.message)
  return NextResponse.json(
    { error: 'خدمة الـ API غير متاحة حالياً. تأكد من أن الباك إند يعمل.' },
    { status: 503 }
  )
}
