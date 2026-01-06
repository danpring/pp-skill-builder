"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Search, Download, Loader2, X, Sparkles, Send } from "lucide-react"
import { SkillTypeTree } from "@/components/skill-type-tree"

interface Skill {
  id: string
  name: string
  type?: {
    id: string
    name: string
  }
  description?: string
  infoUrl?: string
}

interface SkillType {
  id: string
  name: string
}

interface TransformedSkill {
  name: string
  description: string
  lightcast_id: string
  levels: {
    poor: string[]
    basic: string[]
    intermediate: string[]
    advanced: string[]
    exceptional: string[]
  }
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Skill[]>([])
  const [skillTypes, setSkillTypes] = useState<SkillType[]>([])
  const [selectedType, setSelectedType] = useState<string>("")
  const [browseResults, setBrowseResults] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([])
  const [transformedSkills, setTransformedSkills] = useState<TransformedSkill[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isBrowsing, setIsBrowsing] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)
  const { toast } = useToast()
  
  // AI Recommendations state
  const [roleTitle, setRoleTitle] = useState("")
  const [aiConversation, setAiConversation] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [aiRecommendedSkills, setAiRecommendedSkills] = useState<Skill[]>([])
  const [aiReasoning, setAiReasoning] = useState("")
  const [aiFollowUpQuestion, setAiFollowUpQuestion] = useState("")
  const [followUpAnswer, setFollowUpAnswer] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [hasStartedAiFlow, setHasStartedAiFlow] = useState(false)

  useEffect(() => {
    loadSkillTypes()
  }, [])

  const loadSkillTypes = async () => {
    try {
      const response = await fetch("/api/lightcast/skills?action=types")
      const data = await response.json()
      if (data.types) {
        setSkillTypes(data.types)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load skill types",
        variant: "destructive",
      })
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/lightcast/skills?q=${encodeURIComponent(searchQuery)}&limit=20`)
      const data = await response.json()
      if (data.skills) {
        setSearchResults(data.skills)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search skills",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleBrowse = async () => {
    if (!selectedType) {
      toast({
        title: "Error",
        description: "Please select a skill type",
        variant: "destructive",
      })
      return
    }

    setIsBrowsing(true)
    try {
      const response = await fetch(`/api/lightcast/skills?typeId=${selectedType}&limit=30`)
      const data = await response.json()
      if (data.skills) {
        setBrowseResults(data.skills)
      } else {
        setBrowseResults([])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to browse skills",
        variant: "destructive",
      })
    } finally {
      setIsBrowsing(false)
    }
  }

  const toggleSkillSelection = (skill: Skill) => {
    setSelectedSkills((prev) => {
      const exists = prev.find((s) => s.id === skill.id)
      if (exists) {
        return prev.filter((s) => s.id !== skill.id)
      } else {
        return [...prev, skill]
      }
    })
  }

  const selectAll = (skills: Skill[]) => {
    setSelectedSkills((prev) => {
      const newSkills = skills.filter((skill) => !prev.find((s) => s.id === skill.id))
      return [...prev, ...newSkills]
    })
  }

  const removeSkill = (skillId: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== skillId))
  }

  const handleTransform = async () => {
    if (selectedSkills.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one skill",
        variant: "destructive",
      })
      return
    }

    setIsTransforming(true)
    const transformed: TransformedSkill[] = []

    for (let i = 0; i < selectedSkills.length; i++) {
      const skill = selectedSkills[i]
      try {
        const response = await fetch("/api/transform", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }))
          throw new Error(errorData.error || `Failed to transform ${skill.name}`)
        }

        const data = await response.json()
        if (data.transformed) {
          transformed.push(data.transformed)
        } else if (data.error) {
          throw new Error(data.error)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to transform ${skill.name}`
        console.error(`Transform error for ${skill.name}:`, error)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    }

    setTransformedSkills(transformed)
    setIsTransforming(false)

    if (transformed.length > 0) {
      toast({
        title: "Success",
        description: `Transformed ${transformed.length} skill(s)`,
      })
    }
  }

  const handleExport = async () => {
    if (transformedSkills.length === 0) {
      toast({
        title: "Error",
        description: "No transformed skills to export",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: transformedSkills }),
      })

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "people_protocol_skills.json"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "Skills exported successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export skills",
        variant: "destructive",
      })
    }
  }

  const handleAiRecommend = async (initialRole?: string, answer?: string) => {
    const role = initialRole || roleTitle.trim()
    if (!role) {
      toast({
        title: "Error",
        description: "Please enter a role title",
        variant: "destructive",
      })
      return
    }

    setIsAiLoading(true)
    setHasStartedAiFlow(true)

    // Build conversation history
    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      ...aiConversation,
    ]

    // Add initial role or follow-up answer
    if (initialRole) {
      conversationHistory.push({ role: "user", content: `Role: ${role}` })
    } else if (answer) {
      conversationHistory.push({ role: "user", content: answer })
    }

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle: role,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        throw new Error(errorData.error || "Failed to get recommendations")
      }

      const data = await response.json()

      if (data.type === "follow_up") {
        // AI needs more context
        setAiFollowUpQuestion(data.question)
        setAiReasoning("")
        setAiRecommendedSkills([])
        // Update conversation with AI's question
        const updatedConversation = [
          ...conversationHistory,
          { role: "assistant", content: data.question },
        ]
        setAiConversation(updatedConversation)
        toast({
          title: "AI Question",
          description: "The AI needs more information to provide better recommendations",
        })
      } else if (data.type === "skills") {
        // AI has recommendations
        setAiRecommendedSkills(data.skills || [])
        setAiReasoning(data.reasoning || "")
        setAiFollowUpQuestion("")
        setFollowUpAnswer("")
        setAiConversation([])
        
        if (data.skills && data.skills.length > 0) {
          toast({
            title: "Success",
            description: `Found ${data.skills.length} recommended skills`,
          })
        } else {
          toast({
            title: "Info",
            description: "Recommendations generated but no matching skills found in Lightcast database",
          })
        }
      }
    } catch (error) {
      console.error("AI recommendation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI recommendations",
        variant: "destructive",
      })
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleFollowUpAnswer = async () => {
    if (!followUpAnswer.trim()) {
      toast({
        title: "Error",
        description: "Please provide an answer",
        variant: "destructive",
      })
      return
    }

    await handleAiRecommend(undefined, followUpAnswer.trim())
    setFollowUpAnswer("")
  }

  const resetAiFlow = () => {
    setRoleTitle("")
    setAiConversation([])
    setAiRecommendedSkills([])
    setAiReasoning("")
    setAiFollowUpQuestion("")
    setFollowUpAnswer("")
    setHasStartedAiFlow(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">People Protocol Skill Builder</h1>
          <p className="text-muted-foreground">
            Transform Lightcast skills into People Protocol framework format
          </p>
        </div>

        <Tabs defaultValue="search" className="space-y-6">
          <TabsList>
            <TabsTrigger value="search">Search Skills</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="ai-recommend">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Recommendations
            </TabsTrigger>
            <TabsTrigger value="selected">
              Selected ({selectedSkills.length})
            </TabsTrigger>
            <TabsTrigger value="transform">
              Transform & Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Skills by Keyword</CardTitle>
                <CardDescription>
                  Search for skills using keywords
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter search keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch()
                      }
                    }}
                    aria-label="Search keyword input"
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {searchResults.length} result(s) found
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAll(searchResults)}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {searchResults.map((skill) => (
                        <Card key={skill.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedSkills.some((s) => s.id === skill.id)}
                              onCheckedChange={() => toggleSkillSelection(skill)}
                              aria-label={`Select ${skill.name}`}
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold">{skill.name}</h3>
                              {skill.type && (
                                <p className="text-sm text-muted-foreground">
                                  Type: {skill.type.name}
                                </p>
                              )}
                              {skill.description && (
                                <p className="text-sm mt-1">{skill.description}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SkillTypeTree
                onTypeSelect={async (typeId) => {
                  setSelectedType(typeId)
                  setIsBrowsing(true)
                  try {
                    const response = await fetch(`/api/lightcast/skills?typeId=${typeId}&limit=50`)
                    const data = await response.json()
                    if (data.skills) {
                      setBrowseResults(data.skills)
                    } else {
                      setBrowseResults([])
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to load skills for selected type",
                      variant: "destructive",
                    })
                  } finally {
                    setIsBrowsing(false)
                  }
                }}
                selectedTypeId={selectedType}
              />

              {browseResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills in Selected Type</CardTitle>
                    <CardDescription>
                      {browseResults.length} skill(s) found
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAll(browseResults)}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {browseResults.map((skill) => (
                        <Card key={skill.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedSkills.some((s) => s.id === skill.id)}
                              onCheckedChange={() => toggleSkillSelection(skill)}
                              aria-label={`Select ${skill.name}`}
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold">{skill.name}</h3>
                              {skill.type && (
                                <p className="text-sm text-muted-foreground">
                                  Type: {skill.type.name}
                                </p>
                              )}
                              {skill.description && (
                                <p className="text-sm mt-1">{skill.description}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedType && browseResults.length === 0 && !isBrowsing && (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">
                      Select a skill type from the tree to view skills
                    </p>
                  </CardContent>
                </Card>
              )}

              {isBrowsing && (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading skills...</span>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai-recommend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI-Powered Skill Recommendations
                </CardTitle>
                <CardDescription>
                  Enter a role title and let AI recommend the top 6 most important skills for that role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!hasStartedAiFlow ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-title">Role Title</Label>
                      <div className="flex gap-2">
                        <Input
                          id="role-title"
                          placeholder="e.g., Senior Full Stack Developer, Product Manager, Data Analyst..."
                          value={roleTitle}
                          onChange={(e) => setRoleTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAiRecommend(roleTitle.trim())
                            }
                          }}
                          aria-label="Role title input"
                        />
                        <Button 
                          onClick={() => handleAiRecommend(roleTitle.trim())} 
                          disabled={isAiLoading || !roleTitle.trim()}
                        >
                          {isAiLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Get Recommendations
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiFollowUpQuestion && (
                      <Card className="bg-muted/50">
                        <CardHeader>
                          <CardTitle className="text-base">AI Follow-up Question</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm">{aiFollowUpQuestion}</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Your answer..."
                              value={followUpAnswer}
                              onChange={(e) => setFollowUpAnswer(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleFollowUpAnswer()
                                }
                              }}
                              aria-label="Answer to AI question"
                            />
                            <Button 
                              onClick={handleFollowUpAnswer}
                              disabled={isAiLoading || !followUpAnswer.trim()}
                            >
                              {isAiLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Submit
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {aiConversation.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Conversation History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {aiConversation.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg ${
                                  msg.role === "user"
                                    ? "bg-primary/10 ml-4"
                                    : "bg-muted mr-4"
                                }`}
                              >
                                <p className="text-sm font-semibold mb-1">
                                  {msg.role === "user" ? "You" : "AI"}
                                </p>
                                <p className="text-sm">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {aiRecommendedSkills.length > 0 && (
                      <div className="space-y-2">
                        {aiReasoning && (
                          <Card className="bg-muted/50">
                            <CardContent className="pt-6">
                              <p className="text-sm">
                                <strong>AI Reasoning:</strong> {aiReasoning}
                              </p>
                            </CardContent>
                          </Card>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            {aiRecommendedSkills.length} recommended skill(s) found
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectAll(aiRecommendedSkills)}
                            >
                              Select All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetAiFlow}
                            >
                              Start New Search
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                          {aiRecommendedSkills.map((skill) => (
                            <Card key={skill.id} className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedSkills.some((s) => s.id === skill.id)}
                                  onCheckedChange={() => toggleSkillSelection(skill)}
                                  aria-label={`Select ${skill.name}`}
                                />
                                <div className="flex-1">
                                  <h3 className="font-semibold">{skill.name}</h3>
                                  {skill.type && (
                                    <p className="text-sm text-muted-foreground">
                                      Type: {skill.type.name}
                                    </p>
                                  )}
                                  {skill.description && (
                                    <p className="text-sm mt-1">{skill.description}</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {isAiLoading && (
                      <Card>
                        <CardContent className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mr-2" />
                          <span>AI is analyzing the role and finding relevant skills...</span>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="selected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Selected Skills</CardTitle>
                <CardDescription>
                  {selectedSkills.length} skill(s) selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedSkills.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No skills selected yet. Search or browse to add skills.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {selectedSkills.map((skill) => (
                      <Card key={skill.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{skill.name}</h3>
                            {skill.type && (
                              <p className="text-sm text-muted-foreground">
                                Type: {skill.type.name}
                              </p>
                            )}
                            {skill.description && (
                              <p className="text-sm mt-1">{skill.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSkill(skill.id)}
                            aria-label={`Remove ${skill.name}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transform" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transform & Export</CardTitle>
                <CardDescription>
                  Transform selected skills and export to JSON
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>{selectedSkills.length}</strong> skill(s) ready to transform
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTransform}
                      disabled={isTransforming || selectedSkills.length === 0}
                    >
                      {isTransforming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transforming...
                        </>
                      ) : (
                        "Transform Skills"
                      )}
                    </Button>
                    {transformedSkills.length > 0 && (
                      <Button onClick={handleExport} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export JSON
                      </Button>
                    )}
                  </div>
                </div>

                {transformedSkills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">
                      {transformedSkills.length} skill(s) transformed successfully
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {transformedSkills.map((skill, index) => (
                        <Card key={index} className="p-4">
                          <h3 className="font-semibold mb-2">{skill.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{skill.description}</p>
                          <div className="space-y-2 text-sm">
                            <div>
                              <strong>Poor:</strong> {skill.levels.poor.length} statements
                            </div>
                            <div>
                              <strong>Basic:</strong> {skill.levels.basic.length} statements
                            </div>
                            <div>
                              <strong>Intermediate:</strong> {skill.levels.intermediate.length} statements
                            </div>
                            <div>
                              <strong>Advanced:</strong> {skill.levels.advanced.length} statements
                            </div>
                            <div>
                              <strong>Exceptional:</strong> {skill.levels.exceptional.length} statements
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

