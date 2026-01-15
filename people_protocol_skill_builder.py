#!/usr/bin/env python3
"""
People Protocol Skill Builder

Fetches skills from Lightcast API and transforms them into 
People Protocol format using Claude API.

Setup:
1. Set environment variables:
   export LIGHTCAST_CLIENT_ID="your_client_id"
   export LIGHTCAST_CLIENT_SECRET="your_client_secret"
   export ANTHROPIC_API_KEY="your_anthropic_key"

2. Install dependencies:
   pip install requests anthropic

3. Run:
   python people_protocol_skill_builder.py
"""

import os
import json
import requests
from anthropic import Anthropic

# =============================================================================
# CONFIGURATION
# =============================================================================

LIGHTCAST_CLIENT_ID = os.environ.get("LIGHTCAST_CLIENT_ID")
LIGHTCAST_CLIENT_SECRET = os.environ.get("LIGHTCAST_CLIENT_SECRET")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

LIGHTCAST_AUTH_URL = "https://auth.emsicloud.com/connect/token"
LIGHTCAST_SKILLS_URL = "https://emsiservices.com/skills/versions/latest/skills"
LIGHTCAST_VERSIONS_URL = "https://emsiservices.com/skills/versions/latest"

OUTPUT_FILE = "people_protocol_skills.json"

# =============================================================================
# TRANSFORMATION PROMPT
# =============================================================================

TRANSFORMATION_PROMPT = """You are transforming skills into the People Protocol framework format.

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

**CRITICAL - MANDATORY REQUIREMENT**: Each level MUST have EXACTLY 2 or more statements. There should NEVER be 0 or 1 statement for any level. This is a hard requirement that cannot be violated.

- **Poor**: 2–5 statements (define clear "red lines") - **MUST HAVE AT LEAST 2, NEVER 0 OR 1**
- **Basic**: 2–4 statements (core foundational behaviors) - **MUST HAVE AT LEAST 2, NEVER 0 OR 1**
- **Intermediate**: 2–4 statements (solid independent performance) - **MUST HAVE AT LEAST 2, NEVER 0 OR 1**
- **Advanced**: 2–5 statements (multiple aspects of mastery) - **MUST HAVE AT LEAST 2, NEVER 0 OR 1**
- **Exceptional**: 2–3 statements (rare, distinctive achievements) - **MUST HAVE AT LEAST 2, NEVER 0 OR 1**

**Total per skill**: 10–21 observable statements (minimum 10: 2 per level × 5 levels).

**VALIDATION**: Your response will be rejected if ANY level has fewer than 2 statements. Ensure every level has at least 2 statements before returning your response.

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

{{
  "name": "Skill Name",
  "description": "One-line definition",
  "lightcast_id": "original_id",
  "levels": {{
    "poor": ["statement 1", "statement 2"],
    "basic": ["statement 1", "statement 2"],
    "intermediate": ["statement 1", "statement 2"],
    "advanced": ["statement 1", "statement 2", "statement 3"],
    "exceptional": ["statement 1", "statement 2"]
  }}
}}

## Skill to Transform

Name: {skill_name}
Description: {skill_description}
Lightcast ID: {skill_id}

Return ONLY the JSON object, nothing else."""

# =============================================================================
# LIGHTCAST API FUNCTIONS
# =============================================================================

def get_lightcast_token():
    """Authenticate with Lightcast and get access token."""
    data = {
        "client_id": LIGHTCAST_CLIENT_ID,
        "client_secret": LIGHTCAST_CLIENT_SECRET,
        "grant_type": "client_credentials",
        "scope": "emsi_open"
    }
    response = requests.post(LIGHTCAST_AUTH_URL, data=data)
    response.raise_for_status()
    return response.json()["access_token"]


def get_skill_types(token):
    """Get available skill types from Lightcast."""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(LIGHTCAST_VERSIONS_URL, headers=headers)
    response.raise_for_status()
    return response.json()


def search_skills(token, query=None, type_ids=None, limit=50):
    """Search/list skills from Lightcast."""
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "fields": "id,name,type,description,infoUrl",
        "limit": limit
    }
    if query:
        params["q"] = query
    if type_ids:
        params["typeIds"] = type_ids
    
    response = requests.get(LIGHTCAST_SKILLS_URL, headers=headers, params=params)
    response.raise_for_status()
    return response.json().get("data", [])


def get_skill_by_id(token, skill_id):
    """Get a specific skill by ID."""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"https://emsiservices.com/skills/versions/latest/skills/{skill_id}"
    params = {"fields": "id,name,type,description,infoUrl"}
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json().get("data")


# =============================================================================
# CLAUDE API FUNCTIONS
# =============================================================================

def transform_skill(client, skill):
    """Transform a Lightcast skill into People Protocol format using Claude."""
    prompt = TRANSFORMATION_PROMPT.format(
        skill_name=skill.get("name", ""),
        skill_description=skill.get("description", "No description available"),
        skill_id=skill.get("id", "")
    )
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )
    
    response_text = message.content[0].text.strip()
    
    # Parse JSON response
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON if wrapped in markdown
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
            result = json.loads(json_str)
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
            result = json.loads(json_str)
        else:
            raise
    
    # Validate minimum 2 statements per level
    levels = ["poor", "basic", "intermediate", "advanced", "exceptional"]
    validation_errors = []
    
    for level in levels:
        statements = result.get("levels", {}).get(level, [])
        if not isinstance(statements, list) or len(statements) < 2:
            validation_errors.append(
                f'Level "{level}" must have at least 2 statements, but found {len(statements) if isinstance(statements, list) else 0}'
            )
    
    if validation_errors:
        error_msg = f"Invalid skill transformation: {'; '.join(validation_errors)}. Please regenerate with at least 2 statements per level."
        raise ValueError(error_msg)
    
    return result


# =============================================================================
# MAIN APPLICATION
# =============================================================================

def check_credentials():
    """Verify all required credentials are set."""
    missing = []
    if not LIGHTCAST_CLIENT_ID:
        missing.append("LIGHTCAST_CLIENT_ID")
    if not LIGHTCAST_CLIENT_SECRET:
        missing.append("LIGHTCAST_CLIENT_SECRET")
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    
    if missing:
        print("ERROR: Missing environment variables:")
        for var in missing:
            print(f"  - {var}")
        print("\nSet them with:")
        print('  export LIGHTCAST_CLIENT_ID="your_id"')
        print('  export LIGHTCAST_CLIENT_SECRET="your_secret"')
        print('  export ANTHROPIC_API_KEY="your_key"')
        return False
    return True


def display_skills(skills):
    """Display skills in a numbered list."""
    print("\n" + "="*60)
    for i, skill in enumerate(skills, 1):
        skill_type = skill.get("type", {}).get("name", "Unknown")
        desc = skill.get("description", "No description")
        if desc and len(desc) > 60:
            desc = desc[:57] + "..."
        print(f"{i:3}. {skill['name']}")
        print(f"     Type: {skill_type}")
        print(f"     {desc}")
        print()
    print("="*60)


def main():
    print("\n" + "="*60)
    print("  PEOPLE PROTOCOL SKILL BUILDER")
    print("="*60)
    
    # Check credentials
    if not check_credentials():
        return
    
    # Initialize clients
    print("\nConnecting to Lightcast...")
    try:
        token = get_lightcast_token()
        print("✓ Lightcast authenticated")
    except Exception as e:
        print(f"✗ Lightcast authentication failed: {e}")
        return
    
    print("Connecting to Claude...")
    try:
        claude = Anthropic(api_key=ANTHROPIC_API_KEY)
        print("✓ Claude ready")
    except Exception as e:
        print(f"✗ Claude initialization failed: {e}")
        return
    
    # Get skill types
    print("\nFetching skill types...")
    try:
        version_info = get_skill_types(token)
        types = version_info.get("attributions", {}).get("types", [])
        print("\nAvailable skill types:")
        for t in types:
            print(f"  {t['id']}: {t['name']}")
    except Exception as e:
        print(f"Warning: Could not fetch skill types: {e}")
        types = []
    
    # Main loop
    selected_skills = []
    
    while True:
        print("\n" + "-"*60)
        print("OPTIONS:")
        print("  1. Search skills by keyword")
        print("  2. Browse skills by type")
        print("  3. View selected skills")
        print("  4. Transform selected skills and export")
        print("  5. Exit")
        print("-"*60)
        
        choice = input("\nChoice (1-5): ").strip()
        
        if choice == "1":
            query = input("Search keyword: ").strip()
            if query:
                print(f"\nSearching for '{query}'...")
                try:
                    skills = search_skills(token, query=query, limit=20)
                    if skills:
                        display_skills(skills)
                        selection = input("Enter numbers to select (e.g., 1,3,5) or 'all': ").strip()
                        if selection.lower() == "all":
                            selected_skills.extend(skills)
                            print(f"Added {len(skills)} skills")
                        elif selection:
                            indices = [int(x.strip())-1 for x in selection.split(",") if x.strip().isdigit()]
                            for i in indices:
                                if 0 <= i < len(skills):
                                    selected_skills.append(skills[i])
                            print(f"Added {len(indices)} skills")
                    else:
                        print("No skills found")
                except Exception as e:
                    print(f"Search failed: {e}")
        
        elif choice == "2":
            if not types:
                print("No skill types available")
                continue
            print("\nSkill types:")
            for i, t in enumerate(types, 1):
                print(f"  {i}. {t['id']}: {t['name']}")
            type_choice = input("Select type number: ").strip()
            if type_choice.isdigit() and 1 <= int(type_choice) <= len(types):
                type_id = types[int(type_choice)-1]["id"]
                print(f"\nFetching {type_id} skills...")
                try:
                    skills = search_skills(token, type_ids=type_id, limit=30)
                    if skills:
                        display_skills(skills)
                        selection = input("Enter numbers to select (e.g., 1,3,5) or 'all': ").strip()
                        if selection.lower() == "all":
                            selected_skills.extend(skills)
                            print(f"Added {len(skills)} skills")
                        elif selection:
                            indices = [int(x.strip())-1 for x in selection.split(",") if x.strip().isdigit()]
                            for i in indices:
                                if 0 <= i < len(skills):
                                    selected_skills.append(skills[i])
                            print(f"Added {len(indices)} skills")
                    else:
                        print("No skills found")
                except Exception as e:
                    print(f"Browse failed: {e}")
        
        elif choice == "3":
            if selected_skills:
                print(f"\n{len(selected_skills)} skills selected:")
                for i, skill in enumerate(selected_skills, 1):
                    print(f"  {i}. {skill['name']}")
                remove = input("\nRemove any? (enter numbers or 'clear' or press Enter): ").strip()
                if remove.lower() == "clear":
                    selected_skills = []
                    print("Cleared all selections")
                elif remove:
                    indices = sorted([int(x.strip())-1 for x in remove.split(",") if x.strip().isdigit()], reverse=True)
                    for i in indices:
                        if 0 <= i < len(selected_skills):
                            removed = selected_skills.pop(i)
                            print(f"Removed: {removed['name']}")
            else:
                print("\nNo skills selected yet")
        
        elif choice == "4":
            if not selected_skills:
                print("\nNo skills selected. Search and select skills first.")
                continue
            
            print(f"\nTransforming {len(selected_skills)} skills...")
            print("This may take a moment...\n")
            
            transformed = []
            for i, skill in enumerate(selected_skills, 1):
                print(f"[{i}/{len(selected_skills)}] {skill['name']}...", end=" ", flush=True)
                try:
                    result = transform_skill(claude, skill)
                    transformed.append(result)
                    print("✓")
                except Exception as e:
                    print(f"✗ ({e})")
            
            if transformed:
                output = {
                    "framework": "People Protocol",
                    "version": "1.0",
                    "skills": transformed
                }
                
                with open(OUTPUT_FILE, "w") as f:
                    json.dump(output, f, indent=2)
                
                print(f"\n✓ Exported {len(transformed)} skills to {OUTPUT_FILE}")
            else:
                print("\nNo skills were successfully transformed")
        
        elif choice == "5":
            print("\nGoodbye!")
            break
        
        else:
            print("Invalid choice")


if __name__ == "__main__":
    main()
