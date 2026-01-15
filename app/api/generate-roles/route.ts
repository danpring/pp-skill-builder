import { NextRequest, NextResponse } from "next/server"

const ROLE_GENERATION_PROMPT = `You are a workforce planning assistant. Your job is to generate realistic role breakdowns for companies based on their size.

## Your Task

Given a company size (number of employees), generate a realistic breakdown of roles that would exist in such a company. Consider:
- Typical organizational structure for that size
- Common departments and functions
- Realistic role distributions
- Industry-standard role titles

## Response Format

Return ONLY valid JSON in this exact format:
{
  "roles": [
    {
      "title": "Role Title",
      "count": 2,
      "description": "Brief description of what this role does"
    }
  ]
}

## Guidelines

- Use realistic, industry-standard role titles (e.g., "Senior Software Engineer", "Product Manager", "UX Designer")
- The total count of all roles should approximately match the company size (within 10% is acceptable)
- Include a mix of roles: leadership, individual contributors, specialists, etc.
- For small companies (1-50), focus on essential roles with minimal hierarchy
- For medium companies (51-200), include more specialized roles and some management layers
- For large companies (200+), include more hierarchy, specialized departments, and management roles
- Each role should have a brief, clear description
- Return at least 3 roles, but be realistic about the number based on company size

## Examples

For a company of 25 employees:
- CEO (1)
- CTO / Technical Lead (1)
- Senior Software Engineers (3-4)
- Software Engineers (4-5)
- Product Manager (1)
- UX/UI Designer (1-2)
- Marketing Manager (1)
- Sales Representatives (2-3)
- Operations/HR (1-2)
- Customer Support (2-3)

For a company of 100 employees:
- More specialized roles
- Department heads
- More individual contributors in each area
- Support functions (HR, Finance, IT, etc.)

Return ONLY the JSON object, no markdown, no explanation outside the JSON.`

export async function POST(request: NextRequest) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2"

  try {
    const body = await request.json()
    const { companySize } = body

    if (!companySize || typeof companySize !== "number" || companySize < 1) {
      return NextResponse.json(
        { error: "Valid company size (number of employees) is required" },
        { status: 400 }
      )
    }

    const contextPrompt = `Company Size: ${companySize} employees\n\nGenerate a realistic role breakdown for this company size.`

    const fullPrompt = ROLE_GENERATION_PROMPT + "\n\n" + contextPrompt + "\n\nGenerate the role breakdown now."

    console.log("Calling Ollama for role generation...")
    const ollamaUrl = `${ollamaBaseUrl}/api/chat`
    
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          {
            role: "user",
            content: fullPrompt + "\n\nRemember: Return ONLY valid JSON in the exact format specified, no markdown, no explanation.",
          },
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Ollama API error:", response.status, errorText)
      throw new Error(`Ollama API error (${response.status}): ${errorText}`)
    }

    let data
    try {
      data = await response.json()
    } catch (parseError) {
      console.error("Failed to parse Ollama API response as JSON:", parseError)
      throw new Error("Invalid JSON response from Ollama API")
    }

    // Handle Ollama response structure
    let responseText: string
    if (data.message && data.message.content) {
      responseText = data.message.content.trim()
    } else if (data.response) {
      responseText = data.response.trim()
    } else {
      console.error("Invalid Ollama response structure:", JSON.stringify(data, null, 2))
      throw new Error("Invalid response structure from Ollama API")
    }

    // Parse JSON response
    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      // Try to extract JSON if wrapped in markdown
      if (responseText.includes("```json")) {
        const jsonStr = responseText.split("```json")[1].split("```")[0].trim()
        result = JSON.parse(jsonStr)
      } else if (responseText.includes("```")) {
        const jsonStr = responseText.split("```")[1].split("```")[0].trim()
        result = JSON.parse(jsonStr)
      } else {
        console.error("Failed to parse JSON response. Response text:", responseText.substring(0, 500))
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }
    }

    // Validate response structure
    if (!result.roles || !Array.isArray(result.roles)) {
      throw new Error("Invalid response format - expected 'roles' array")
    }

    // Validate each role has required fields
    const validatedRoles = result.roles
      .filter((role: any) => role.title && typeof role.count === "number" && role.count > 0)
      .map((role: any) => ({
        title: String(role.title).trim(),
        count: Math.max(1, Math.floor(role.count)),
        description: role.description ? String(role.description).trim() : undefined,
      }))

    if (validatedRoles.length === 0) {
      throw new Error("No valid roles generated")
    }

    return NextResponse.json({
      roles: validatedRoles,
      totalPositions: validatedRoles.reduce((sum: number, r: any) => sum + r.count, 0),
    })
  } catch (error) {
    console.error("Generate roles error:", error)
    const errorMessage = error instanceof Error ? error.message : "Role generation failed"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
