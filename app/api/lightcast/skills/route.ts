import { NextRequest, NextResponse } from "next/server"

const LIGHTCAST_SKILLS_URL = "https://emsiservices.com/skills/versions/latest/skills"
const LIGHTCAST_VERSIONS_URL = "https://emsiservices.com/skills/versions/latest"

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const typeId = searchParams.get("typeId")
  const limit = searchParams.get("limit") || "50"
  const action = searchParams.get("action") || "search"

  try {
    const token = await getToken()
    const headers = { Authorization: `Bearer ${token}` }

    if (action === "types") {
      // First try the versions endpoint
      const response = await fetch(LIGHTCAST_VERSIONS_URL, { headers })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch types: ${response.statusText} - ${errorText}`)
      }
      const data = await response.json()
      
      // Try different possible structures from versions endpoint
      let types = []
      if (data.attributions?.types) {
        types = data.attributions.types
      } else if (data.types) {
        types = data.types
      } else if (data.data?.attributions?.types) {
        types = data.data.attributions.types
      } else if (data.data?.types) {
        types = data.data.types
      } else if (Array.isArray(data)) {
        types = data
      }
      
      // If we still don't have types, try extracting from skills
      if (types.length === 0) {
        try {
          // Fetch a sample of skills to extract types
          const skillsResponse = await fetch(`${LIGHTCAST_SKILLS_URL}?fields=id,name,type&limit=1000`, { headers })
          if (skillsResponse.ok) {
            const skillsData = await skillsResponse.json()
            const skills = skillsData.data || []
            
            // Extract unique types from skills
            const typeMap = new Map<string, { id: string; name: string }>()
            skills.forEach((skill: any) => {
              if (skill.type && skill.type.id && skill.type.name) {
                if (!typeMap.has(skill.type.id)) {
                  typeMap.set(skill.type.id, {
                    id: skill.type.id,
                    name: skill.type.name,
                  })
                }
              }
            })
            
            types = Array.from(typeMap.values())
          }
        } catch (error) {
          console.error("Failed to extract types from skills:", error)
        }
      }
      
      // If we still don't have types, return the full data structure for debugging
      if (types.length === 0) {
        console.error("No types found in response structure:", JSON.stringify(data, null, 2))
      }
      
      return NextResponse.json({ types, debug: types.length === 0 ? data : undefined })
    }

    if (action === "counts") {
      // Get all types first
      const typesResponse = await fetch(LIGHTCAST_VERSIONS_URL, { headers })
      if (!typesResponse.ok) throw new Error("Failed to fetch types")
      const typesData = await typesResponse.json()
      
      // Try different possible structures
      let types = []
      if (typesData.attributions?.types) {
        types = typesData.attributions.types
      } else if (typesData.types) {
        types = typesData.types
      } else if (typesData.data?.attributions?.types) {
        types = typesData.data.attributions.types
      } else if (typesData.data?.types) {
        types = typesData.data.types
      } else if (Array.isArray(typesData)) {
        types = typesData
      }

      // Get counts for each type in parallel for better performance
      const counts: Record<string, number> = {}
      const countPromises = types.map(async (type: { id: string }) => {
        try {
          const params = new URLSearchParams({
            fields: "id",
            typeIds: type.id,
            limit: "1",
          })
          const countResponse = await fetch(`${LIGHTCAST_SKILLS_URL}?${params}`, { headers })
          if (countResponse.ok) {
            const countData = await countResponse.json()
            // Get total from meta if available, otherwise estimate from data length
            return {
              typeId: type.id,
              count: countData.meta?.total || countData.data?.length || 0,
            }
          }
          return { typeId: type.id, count: 0 }
        } catch (error) {
          return { typeId: type.id, count: 0 }
        }
      })

      const countResults = await Promise.all(countPromises)
      countResults.forEach(({ typeId, count }) => {
        counts[typeId] = count
      })

      return NextResponse.json({ counts })
    }

    const params = new URLSearchParams({
      fields: "id,name,type,description,infoUrl",
      limit,
    })

    if (query) {
      params.append("q", query)
    }
    if (typeId) {
      params.append("typeIds", typeId)
    }

    const response = await fetch(`${LIGHTCAST_SKILLS_URL}?${params}`, { headers })
    if (!response.ok) throw new Error("Failed to fetch skills")
    const data = await response.json()
    return NextResponse.json({ skills: data.data || [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    )
  }
}

