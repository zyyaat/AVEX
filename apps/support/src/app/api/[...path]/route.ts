import { NextRequest, NextResponse } from 'next/server'

const API_BASE = 'http://localhost:8080'

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
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') body = await req.text()

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
    return NextResponse.json({ error: 'خدمة الـ API غير متاحة' }, { status: 503 })
  }
}
