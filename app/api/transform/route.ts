import { NextRequest, NextResponse } from "next/server"

const TRANSFORMATION_PROMPT = `You are transforming skills into the People Protocol framework format.

## What is a Skill?

Skills are technical and functional competencies required for a role. They are NOT:
- Behaviors/Values (universal organizational attributes)
- Deliverables (output metrics like speed, quality)
- Personality traits (abstract characteristics)

Skills provide clear roadmaps for growth, objective recruitment criteria, and standardized expectations.

## The Five Proficiency Levels

Each skill uses a consistent five-level scale that builds cumulatively. An employee at "Advanced" has demonstrated all behaviors at Poor (absence of), Basic, and Intermediate levels.

| Level | Label | Definition |
|-------|-------|------------|
| 1 | **Poor** | Red flag behaviors—no employee should exhibit these. Indicates fundamental gaps or negative impact. |
| 2 | **Basic** | Minimum acceptable standard. Foundational competency expected of entry-level employees. |
| 3 | **Intermediate** | Solid proficiency. Independent execution with reliability on complex tasks. |
| 4 | **Advanced** | High mastery. Strategic application, innovation, and ability to handle novel situations. |
| 5 | **Exceptional** | World-class. Industry-leading expertise that only the very best demonstrate. |

## Observable Statement Requirements

Each statement must be:
- **Observable**: Based on actions a manager can witness, not internal states
- **Specific**: Describes concrete behaviors, not vague qualities
- **Binary**: Can be answered Yes or No without ambiguity
- **Action-oriented**: Uses verbs that describe what someone does
- **Level-appropriate**: Complexity matches the proficiency level

**Good examples**: "Delivers tasks on time", "Identifies errors in seemingly correct statements by applying critical thinking", "Breaks down simple problems based on data and resolves them"

**Bad examples**: "Has good time management", "Thinks critically", "Is pretty good at problem-solving"

## Statement Quantity Per Level

- **Poor**: 2–5 statements (define clear "red lines")
- **Basic**: 2–4 statements (core foundational behaviors)
- **Intermediate**: 2–4 statements (solid independent performance)
- **Advanced**: 3–5 statements (multiple aspects of mastery)
- **Exceptional**: 1–3 statements (rare, distinctive achievements)

**Total per skill**: 12–20 observable statements.

## Statement Writing Patterns by Level

**Poor Level** (what NOT to do):
- "Demonstrates unstructured [skill], fails to [expected outcome]"
- "Lacks [key attribute], [negative consequence]"
- "[Negative behavior] when challenged"
- "Unable to [basic expectation]"

**Basic Level** (foundational competency):
- "Shows common sense by [observable action]"
- "Can [basic task] based on [inputs]"
- "[Core competency]: [expected output]"
- "Recognizes [fundamental concepts] and applies them correctly"

**Intermediate Level** (independent execution):
- "Identifies [nuanced issues] by applying [method]"
- "Delves into [complex areas] until reaching deep understanding"
- "Consistently [positive behavior] without supervision"
- "Able to [complex output] with minimal guidance"

**Advanced Level** (strategic mastery):
- "Can synthesize [complex inputs] and connect [non-obvious elements]"
- "Approaches [skill area] in an innovative way"
- "Able to [teach/mentor/develop] others in [skill area]"
- "Creates [frameworks/standards] adopted by the team"

**Exceptional Level** (industry-leading):
- "Engages in [abstract/theoretical work] at the highest level"
- "Solves [unprecedented challenges] using [advanced methods]"
- "Recognized externally as an authority in [skill area]"
- "Redefines [industry/field] standards and expectations"

## Scorecard Mechanics

Managers assess skills by reviewing each statement starting from Poor, marking "Yes" or "No" based on observed behavior, and stopping at the first "No" response. The employee's level is the highest level where all statements are "Yes".

**Critical**: Earlier statements (Poor, Basic) must be absolute prerequisites. A "No" at Basic means the employee scores Poor, regardless of advanced capabilities.

## Quality Checklist

Before generating statements, ensure:
- All statements are observable (manager can answer Yes/No)
- Each statement is distinct (no duplicates across levels)
- Poor level describes genuinely problematic behaviors
- Basic level is achievable by entry-level employees
- Exceptional level is genuinely rare (top 1–5%)
- Statements use action verbs (demonstrates, delivers, identifies, creates)
- Statements avoid subjective qualifiers (good, bad, excellent)
- Progression from Poor → Exceptional shows clear capability increase

## Output Format

Return ONLY valid JSON in this exact structure (no markdown, no explanation):

{
  "name": "Skill Name",
  "description": "One-line definition",
  "lightcast_id": "original_id",
  "levels": {
    "poor": ["statement 1", "statement 2"],
    "basic": ["statement 1", "statement 2"],
    "intermediate": ["statement 1", "statement 2"],
    "advanced": ["statement 1", "statement 2", "statement 3"],
    "exceptional": ["statement 1"]
  }
}

## Skill to Transform

Name: {skill_name}
Description: {skill_description}
Lightcast ID: {skill_id}

Return ONLY the JSON object, nothing else.`

export async function POST(request: NextRequest) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2"

  console.log("Transform API called")
  console.log("Ollama URL:", ollamaBaseUrl)
  console.log("Ollama Model:", ollamaModel)

  try {
    const body = await request.json()
    console.log("Request body received:", { skillName: body.skill?.name, skillId: body.skill?.id })
    const { skill } = body

    if (!skill || !skill.name || !skill.id) {
      return NextResponse.json(
        { error: "Invalid skill data" },
        { status: 400 }
      )
    }

    const prompt = TRANSFORMATION_PROMPT
      .replace("{skill_name}", skill.name)
      .replace("{skill_description}", skill.description || "No description available")
      .replace("{skill_id}", skill.id)

    console.log("Calling Ollama API...")
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
            content: prompt + "\n\nRemember: Return ONLY valid JSON in the exact structure specified, no markdown, no explanation.",
          },
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      }),
    })

    console.log("Ollama API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Ollama API error:", response.status, errorText)
      throw new Error(`Ollama API error (${response.status}): ${errorText}`)
    }

    let data
    try {
      data = await response.json()
      console.log("Ollama API response received")
    } catch (parseError) {
      console.error("Failed to parse Ollama API response as JSON:", parseError)
      throw new Error("Invalid JSON response from Ollama API")
    }

    // Handle Ollama response structure
    let responseText: string
    if (data.message && data.message.content) {
      responseText = data.message.content.trim()
    } else if (data.response) {
      // Fallback for /api/generate format
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

    return NextResponse.json({ transformed: result })
  } catch (error) {
    console.error("Transform error:", error)
    const errorMessage = error instanceof Error ? error.message : "Transformation failed"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

