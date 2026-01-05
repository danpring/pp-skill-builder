import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { skills } = await request.json()

    if (!Array.isArray(skills)) {
      return NextResponse.json(
        { error: "Invalid skills data" },
        { status: 400 }
      )
    }

    const output = {
      framework: "People Protocol",
      version: "1.0",
      skills,
    }

    return NextResponse.json(output, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="people_protocol_skills.json"',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    )
  }
}

