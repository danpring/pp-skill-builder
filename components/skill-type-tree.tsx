"use client"

import { useState, useEffect, useMemo } from "react"
import { Tree, Folder, File, type TreeViewElement } from "@/components/ui/file-tree"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Database, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

interface SkillType {
  id: string
  name: string
}

interface SkillTypeTreeProps {
  onTypeSelect: (typeId: string) => void
  selectedTypeId?: string
}

export const SkillTypeTree = ({ onTypeSelect, selectedTypeId }: SkillTypeTreeProps) => {
  const [types, setTypes] = useState<SkillType[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [filterQuery, setFilterQuery] = useState("")
  const [minCount, setMinCount] = useState<string>("")
  const [sortBy, setSortBy] = useState<"name" | "count">("name")
  const { toast } = useToast()

  useEffect(() => {
    loadTypesAndCounts()
  }, [])


  const loadTypesAndCounts = async () => {
    setIsLoading(true)
    try {
      // Load types
      const typesResponse = await fetch("/api/lightcast/skills?action=types")
      if (!typesResponse.ok) {
        const errorText = await typesResponse.text()
        throw new Error(`Failed to fetch types: ${typesResponse.status} - ${errorText}`)
      }
      const typesData = await typesResponse.json()
      
      if (typesData.error) {
        throw new Error(typesData.error)
      }
      
      if (typesData.types && Array.isArray(typesData.types)) {
        setTypes(typesData.types)
      } else if (typesData.debug) {
        // If we got debug info, show it
        console.error("API returned debug info - unexpected structure:", typesData.debug)
        toast({
          title: "Warning",
          description: "Unexpected API response structure. Check console for details.",
          variant: "destructive",
        })
      } else {
        console.error("No types found in response:", typesData)
        toast({
          title: "Error",
          description: "No skill types found in API response",
          variant: "destructive",
        })
      }

      // Load counts only if we have types
      if (typesData.types && typesData.types.length > 0) {
        const countsResponse = await fetch("/api/lightcast/skills?action=counts")
        if (countsResponse.ok) {
          const countsData = await countsResponse.json()
          if (countsData.counts) {
            setCounts(countsData.counts)
          }
        }
      }
    } catch (error) {
      console.error("Error loading types:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load skill types and counts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalTypes = types.length
    const totalSkills = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const avgSkillsPerType = totalTypes > 0 ? Math.round(totalSkills / totalTypes) : 0
    const maxCount = Math.max(...Object.values(counts), 0)
    const minCountValue = Math.min(...Object.values(counts).filter(c => c > 0), 0)
    
    return {
      totalTypes,
      totalSkills,
      avgSkillsPerType,
      maxCount,
      minCount: minCountValue,
    }
  }, [types, counts])

  // Build tree structure from types
  const treeElements = useMemo(() => {
    if (!types.length) return []

    // Filter types based on search query and count
    let filteredTypes = types.filter((type) =>
      type.name.toLowerCase().includes(filterQuery.toLowerCase())
    )

    // Filter by minimum count if set
    if (minCount) {
      const minCountNum = parseInt(minCount, 10)
      if (!isNaN(minCountNum)) {
        filteredTypes = filteredTypes.filter((type) => (counts[type.id] || 0) >= minCountNum)
      }
    }

    // Sort types
    filteredTypes = [...filteredTypes].sort((a, b) => {
      if (sortBy === "count") {
        const countA = counts[a.id] || 0
        const countB = counts[b.id] || 0
        return countB - countA
      } else {
        return a.name.localeCompare(b.name)
      }
    })

    // Group types into categories based on name patterns
    const categories: Record<string, SkillType[]> = {}
    
    filteredTypes.forEach((type) => {
      // Categorize based on type name patterns
      let category = "Other Skills"
      
      if (type.name.toLowerCase().includes("common") || type.id.toLowerCase().includes("st1")) {
        category = "Common Skills"
      } else if (type.name.toLowerCase().includes("specialized") || type.id.toLowerCase().includes("st2")) {
        category = "Specialized Skills"
      } else if (type.name.toLowerCase().includes("software") || type.name.toLowerCase().includes("tool")) {
        category = "Software & Tools"
      } else if (type.name.toLowerCase().includes("language") || type.name.toLowerCase().includes("communication")) {
        category = "Languages & Communication"
      }

      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(type)
    })

    // Convert to tree structure
    const tree: TreeViewElement[] = Object.entries(categories).map(([category, categoryTypes]) => ({
      id: `category-${category}`,
      name: `${category} (${categoryTypes.length})`,
      isSelectable: false,
      children: categoryTypes.map((type) => ({
        id: type.id,
        name: type.name,
        isSelectable: true,
      })),
    }))

    // If no categories, just show flat list
    if (Object.keys(categories).length === 0 && filteredTypes.length > 0) {
      return filteredTypes.map((type) => ({
        id: type.id,
        name: type.name,
        isSelectable: true,
      }))
    }

    return tree
  }, [types, counts, filterQuery])

  const handleFileSelect = (typeId: string) => {
    // Only handle selection for actual type IDs, not category IDs
    if (typeId && !typeId.startsWith("category-")) {
      onTypeSelect(typeId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading skill types...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Browse Skill Types</CardTitle>
            <CardDescription>
              Explore the Lightcast skill database by type. Click on a type to view skills.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadTypesAndCounts}
            disabled={isLoading}
            aria-label="Refresh skill types"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Summary */}
        {types.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5" />
                <h3 className="font-semibold">Lightcast Database Summary</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Types</p>
                  <p className="text-2xl font-bold">{summary.totalTypes}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Skills</p>
                  <p className="text-2xl font-bold">{summary.totalSkills.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg per Type</p>
                  <p className="text-2xl font-bold">{summary.avgSkillsPerType.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Count</p>
                  <p className="text-2xl font-bold">{summary.maxCount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Filters</Label>
          </div>
          
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="pl-10"
                aria-label="Filter skill types by name"
              />
            </div>
            
            <div>
              <Label htmlFor="min-count" className="text-xs text-muted-foreground mb-1 block">
                Minimum Skills
              </Label>
              <Input
                id="min-count"
                type="number"
                placeholder="Min count..."
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
                aria-label="Filter by minimum skill count"
              />
            </div>
            
            <div>
              <Label htmlFor="sort-by" className="text-xs text-muted-foreground mb-1 block">
                Sort By
              </Label>
              <Select value={sortBy} onValueChange={(value: "name" | "count") => setSortBy(value)}>
                <SelectTrigger id="sort-by" aria-label="Sort skill types">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="count">Count (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {treeElements.length > 0 ? (
          <div className="border rounded-md p-4 max-h-[600px] overflow-auto">
            <Tree
              elements={treeElements}
              initialSelectedId={selectedTypeId}
              initialExpandedItems={treeElements.map((el) => el.id)}
              indicator
            >
              {treeElements.map((category) => {
                if (!('children' in category) || !category.children || category.children.length === 0) {
                  return null
                }
                return (
                  <Folder key={category.id} element={category.name} value={category.id}>
                    {category.children.map((type) => (
                      <File
                        key={type.id}
                        value={type.id}
                        isSelect={selectedTypeId === type.id}
                        handleSelect={() => handleFileSelect(type.id)}
                        onClick={() => handleFileSelect(type.id)}
                      >
                        {type.name} <span className="text-muted-foreground text-xs">({counts[type.id] || 0})</span>
                      </File>
                    ))}
                  </Folder>
                )
              })}
            </Tree>
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <p className="text-muted-foreground">
              {filterQuery || minCount
                ? "No types found matching your filters"
                : "No skill types available"}
            </p>
            {types.length === 0 && !isLoading && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>This could mean:</p>
                <ul className="list-disc list-inside text-left max-w-md mx-auto space-y-1">
                  <li>The Lightcast API credentials are not configured</li>
                  <li>The API response structure is different than expected</li>
                  <li>There was an error connecting to the API</li>
                </ul>
                <p className="mt-2">Check the browser console for detailed error messages.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

