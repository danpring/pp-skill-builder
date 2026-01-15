import { NextRequest, NextResponse } from "next/server"

const LIGHTCAST_SKILLS_URL = "https://emsiservices.com/skills/versions/latest/skills"

async function getToken(): Promise<string> {
  const clientId = process.env.LIGHTCAST_CLIENT_ID
  const clientSecret = process.env.LIGHTCAST_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Missing Lightcast credentials")
  }

  const response = await fetch("https://auth.emsicloud.com/connect/token", {
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
  if (!data.access_token) {
    throw new Error("Failed to get token")
  }
  return data.access_token
}

// Function to check if two skill names are too similar (duplicates or near-duplicates)
function areSkillsSimilar(skill1: string, skill2: string): boolean {
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '')
  const s1 = normalize(skill1)
  const s2 = normalize(skill2)
  
  // Exact match (after normalization)
  if (s1 === s2) return true
  
  // Check if one contains the other (e.g., "Python" and "Python Programming")
  if (s1.includes(s2) || s2.includes(s1)) {
    // But allow if the difference is substantial (more than just a few words)
    const words1 = s1.split(/\s+/)
    const words2 = s2.split(/\s+/)
    const diff = Math.abs(words1.length - words2.length)
    // If one is significantly longer, they might be different (e.g., "Python" vs "Python Web Development")
    if (diff <= 2 && (words1.length <= 3 || words2.length <= 3)) {
      return true
    }
  }
  
  // Check for very similar names (e.g., "Data Analysis" vs "Data Analytics")
  const words1 = s1.split(/\s+/)
  const words2 = s2.split(/\s+/)
  
  // If they share most words and have similar length
  if (words1.length === words2.length && words1.length <= 3) {
    const commonWords = words1.filter(w => words2.includes(w))
    if (commonWords.length >= words1.length - 1) {
      // Check if the difference is just a suffix variation (e.g., "analysis" vs "analytics")
      const differentWords1 = words1.filter(w => !words2.includes(w))
      const differentWords2 = words2.filter(w => !words1.includes(w))
      if (differentWords1.length === 1 && differentWords2.length === 1) {
        const diff1 = differentWords1[0]
        const diff2 = differentWords2[0]
        // Check if they're just variations (e.g., "analysis" vs "analytics", "management" vs "managing")
        if (diff1.startsWith(diff2.substring(0, 5)) || diff2.startsWith(diff1.substring(0, 5))) {
          return true
        }
      }
    }
  }
  
  return false
}

// Function to filter out duplicate and similar skills
function filterSimilarSkills(skills: any[]): any[] {
  const filtered: any[] = []
  const seenNames = new Set<string>()
  
  for (const skill of skills) {
    const skillName = skill.name || ''
    const normalizedName = skillName.toLowerCase().trim()
    
    // Check if we've already seen this exact name
    if (seenNames.has(normalizedName)) {
      continue
    }
    
    // Check if this skill is similar to any already included skill
    let isSimilar = false
    for (const existingSkill of filtered) {
      const existingName = existingSkill.name || ''
      if (areSkillsSimilar(skillName, existingName)) {
        isSimilar = true
        break
      }
    }
    
    if (!isSimilar) {
      filtered.push(skill)
      seenNames.add(normalizedName)
    }
  }
  
  return filtered
}

const RECOMMENDATION_PROMPT = `You are a skill recommendation assistant. Your job is to help identify the top 6 most important and diverse skills for a given role.

## Your Task

Given a role title and any additional context provided, you need to:
1. Determine if you have enough information to recommend skills, OR
2. Ask a single, specific follow-up question to get more context

## When to Ask Follow-up Questions

Ask follow-up questions when:
- The role title is ambiguous (e.g., "Manager" - what type?)
- Industry/domain context would improve recommendations (e.g., "Developer" - what stack?)
- Seniority level matters (e.g., "Engineer" - junior, mid, or senior?)
- Team/company context would help (e.g., "Analyst" - what kind of analysis?)

## When to Recommend Skills

Once you have enough context, provide exactly 6 skill keywords/phrases that are most critical for this role. These should be:
- Specific and actionable skill names
- Relevant to the role and context provided
- Covering a good mix: technical skills, soft skills, domain expertise
- **CRITICALLY IMPORTANT**: Each skill must be DISTINCT and NON-DUPLICATIVE
  - Do NOT recommend skills that are slight variations of the same thing (e.g., "Python" and "Python Programming" are duplicates)
  - Do NOT recommend skills with very similar titles or types (e.g., "Data Analysis" and "Data Analytics" are too similar)
  - Ensure each skill represents a UNIQUE and DIFFERENT competency area
  - Aim for a BROAD, COMPREHENSIVE cross-section that covers all core elements of the role
  - Think of skills as representing different dimensions of the role (e.g., technical, communication, domain knowledge, tools, methodologies, leadership)

## Examples of Good Skill Selection (Diverse and Non-Duplicative)

For a "Senior Full Stack Developer" role:
- ✅ "JavaScript Programming" (technical core)
- ✅ "System Architecture" (design/architecture)
- ✅ "Agile Methodologies" (process/methodology)
- ✅ "Code Review" (quality assurance)
- ✅ "API Design" (integration/interface)
- ✅ "Technical Leadership" (leadership/mentoring)

For a "Product Manager" role:
- ✅ "Product Strategy" (strategic planning)
- ✅ "User Research" (user understanding)
- ✅ "Stakeholder Management" (communication/coordination)
- ✅ "Data Analysis" (analytics/decision-making)
- ✅ "Agile Product Development" (process/methodology)
- ✅ "Roadmap Planning" (planning/execution)

## Examples of Bad Skill Selection (Duplicative or Too Similar)

❌ "Python", "Python Programming", "Python Development" (all the same skill)
❌ "Data Analysis", "Data Analytics", "Analytical Skills" (too similar)
❌ "Project Management", "Project Planning", "Managing Projects" (duplicates)
❌ "Communication", "Verbal Communication", "Written Communication" (too granular/variations)

## Response Format

Return ONLY valid JSON in one of these two formats:

**If you need more context:**
{
  "type": "follow_up",
  "question": "Your single, specific follow-up question here"
}

**If you're ready to recommend:**
{
  "type": "skills",
  "skills": ["Skill keyword 1", "Skill keyword 2", "Skill keyword 3", "Skill keyword 4", "Skill keyword 5", "Skill keyword 6"],
  "reasoning": "Brief explanation of why these skills are important for this role and how they represent diverse competency areas"
}

## Important Rules

- Ask only ONE follow-up question at a time
- Make questions specific and actionable
- When recommending skills, always provide exactly 6 skill keywords
- Use clear, searchable skill names (e.g., "Python Programming", "Project Management", "Data Analysis")
- **MANDATORY**: Ensure all 6 skills are DISTINCT and represent DIFFERENT competency areas - no duplicates or near-duplicates
- **MANDATORY**: Provide a BROAD cross-section that demonstrates all core elements of the role
- Return ONLY the JSON object, no markdown, no explanation outside the JSON`

export async function POST(request: NextRequest) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434"
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2"

  try {
    const body = await request.json()
    const { roleTitle, conversationHistory = [] } = body

    if (!roleTitle || typeof roleTitle !== "string" || !roleTitle.trim()) {
      return NextResponse.json(
        { error: "Role title is required" },
        { status: 400 }
      )
    }

    // Build conversation context for the AI
    let contextPrompt = `Role Title: ${roleTitle.trim()}\n\n`
    
    if (conversationHistory.length > 0) {
      contextPrompt += "Conversation History:\n"
      conversationHistory.forEach((msg: { role: string; content: string }) => {
        contextPrompt += `${msg.role}: ${msg.content}\n`
      })
      contextPrompt += "\n"
    }

    const fullPrompt = RECOMMENDATION_PROMPT + "\n\n" + contextPrompt + "\nAnalyze the role and either ask a follow-up question or recommend 6 skills."

    console.log("Calling Ollama for skill recommendations...")
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
          num_predict: 1000,
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
    if (result.type === "follow_up") {
      if (!result.question || typeof result.question !== "string") {
        throw new Error("Invalid follow-up response format")
      }
      return NextResponse.json({
        type: "follow_up",
        question: result.question,
      })
    }

    if (result.type === "skills") {
      if (!Array.isArray(result.skills) || result.skills.length !== 6) {
        throw new Error("Invalid skills response format - expected exactly 6 skills")
      }

      // Search Lightcast API for each skill keyword
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }

        // Search for skills matching the keywords
        // We'll search for each keyword and combine results
        const searchPromises = result.skills.map(async (skillKeyword: string) => {
          const params = new URLSearchParams({
            fields: "id,name,type,description,infoUrl",
            q: skillKeyword,
            limit: "5", // Get top 5 matches per keyword
          })
          
          try {
            const searchResponse = await fetch(`${LIGHTCAST_SKILLS_URL}?${params}`, { headers })
            if (!searchResponse.ok) return []
            const searchData = await searchResponse.json()
            return searchData.data || []
          } catch (error) {
            console.error(`Error searching for skill "${skillKeyword}":`, error)
            return []
          }
        })

        const searchResults = await Promise.all(searchPromises)
        
        // Flatten and deduplicate by skill ID
        const allSkills: any[] = []
        const seenIds = new Set<string>()
        
        searchResults.flat().forEach((skill: any) => {
          if (skill.id && !seenIds.has(skill.id)) {
            seenIds.add(skill.id)
            allSkills.push(skill)
          }
        })

        // Filter out similar/duplicate skills by name
        const uniqueSkills = filterSimilarSkills(allSkills)

        // Sort by relevance (prioritize skills that match keywords exactly or closely)
        // Take the first 6 unique and diverse skills
        const recommendedSkills = uniqueSkills.slice(0, 6)

        // If we don't have 6 skills yet, try broader searches
        if (recommendedSkills.length < 6) {
          // Try searching with broader terms
          const broaderSearches = result.skills.map((skillKeyword: string) => {
            // Extract main words from the keyword
            const words = skillKeyword.toLowerCase().split(/\s+/)
            return words[0] // Use first word for broader search
          })

          for (const broaderTerm of broaderSearches) {
            if (recommendedSkills.length >= 6) break
            
            const params = new URLSearchParams({
              fields: "id,name,type,description,infoUrl",
              q: broaderTerm,
              limit: "10",
            })
            
            try {
              const searchResponse = await fetch(`${LIGHTCAST_SKILLS_URL}?${params}`, { headers })
              if (searchResponse.ok) {
                const searchData = await searchResponse.json()
                const skills = searchData.data || []
                // Filter out skills that are similar to already selected ones
                const newSkills = skills.filter((skill: any) => {
                  if (!skill.id || seenIds.has(skill.id)) return false
                  // Check if similar to any already selected skill
                  return !recommendedSkills.some((existing: any) => 
                    areSkillsSimilar(skill.name || '', existing.name || '')
                  )
                })
                
                newSkills.forEach((skill: any) => {
                  if (recommendedSkills.length < 6) {
                    seenIds.add(skill.id)
                    recommendedSkills.push(skill)
                  }
                })
              }
            } catch (error) {
              console.error(`Error in broader search for "${broaderTerm}":`, error)
            }
          }
        }

        return NextResponse.json({
          type: "skills",
          skills: recommendedSkills,
          reasoning: result.reasoning || "Skills recommended based on role analysis",
          keywords: result.skills,
        })
      } catch (error) {
        console.error("Error searching Lightcast API:", error)
        // Return the keywords even if we couldn't search Lightcast
        return NextResponse.json({
          type: "skills",
          skills: [],
          reasoning: result.reasoning || "Skills recommended based on role analysis",
          keywords: result.skills,
          error: error instanceof Error ? error.message : "Failed to search Lightcast API",
        })
      }
    }

    throw new Error("Invalid response type from AI")
  } catch (error) {
    console.error("Recommend error:", error)
    const errorMessage = error instanceof Error ? error.message : "Recommendation failed"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

