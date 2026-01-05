import { NextResponse } from "next/server"

const LIGHTCAST_AUTH_URL = "https://auth.emsicloud.com/connect/token"

export async function POST() {
  const clientId = process.env.LIGHTCAST_CLIENT_ID
  const clientSecret = process.env.LIGHTCAST_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing Lightcast credentials" },
      { status: 401 }
    )
  }

  try {
    const response = await fetch(LIGHTCAST_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "emsi_open",
      }),
    })

    if (!response.ok) {
      throw new Error(`Lightcast auth failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json({ token: data.access_token })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 }
    )
  }
}

