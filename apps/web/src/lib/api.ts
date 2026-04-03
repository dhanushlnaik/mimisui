import { NextResponse } from "next/server";

export function ok<T>(data: T) {
  return NextResponse.json({ ok: true, data });
}

export function fail(error: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

