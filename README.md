# People Protocol Skill Builder

A web application that fetches skills from the Lightcast API and transforms them into the People Protocol framework format using Claude (Anthropic). Available as both a Python CLI tool and a modern Next.js web interface.

## Overview

This tool helps you:
- Search and browse skills from the Lightcast API
- Select skills you want to transform
- Automatically generate behavioral statements across five proficiency levels using Claude AI
- Export skills in the People Protocol framework format

## Prerequisites

- Node.js 18+ (for web interface)
- Python 3.7+ (for CLI tool)
- Lightcast API credentials (Client ID and Client Secret)
- Local Ollama installation (for skill transformations)

## Setup

1. **Clone or download this repository**

2. **Set up environment variables:**
   
   Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```
   
   Then edit `.env.local` (or `.env`) with your credentials:
   ```
   LIGHTCAST_CLIENT_ID=your_client_id
   LIGHTCAST_CLIENT_SECRET=your_client_secret
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```

### Web Interface (Recommended)

3. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

### CLI Tool (Alternative)

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables in your shell:**
   ```bash
   export LIGHTCAST_CLIENT_ID="your_client_id"
   export LIGHTCAST_CLIENT_SECRET="your_client_secret"
   export GOOGLE_API_KEY="your_google_api_key"
   ```

5. **Run the script:**
   ```bash
   python people_protocol_skill_builder.py
   ```

## Usage

### Web Interface

The web interface provides a modern, user-friendly experience with:
- **Search Skills**: Search for skills by keyword
- **Browse**: Explore skills using an interactive tree view of skill types with counts. Filter types by name and click on any type to view its skills. Types are automatically categorized (Common Skills, Specialized Skills, Software & Tools, etc.) for easy navigation.
- **AI Recommendations (Browse by Role)**: Get AI-powered skill recommendations based on role titles. Enter multiple role titles (e.g., "Senior Full Stack Developer", "Product Manager", "Data Scientist") to discover skills for each role. The AI will analyze each role and recommend the top 6 most relevant skills from the Lightcast database. You can:
  - Search multiple roles in sequence to build up a large list of skills (100s of skills)
  - View all your role searches in a history panel
  - Add all skills from a role search to your selected list with one click
  - See which skills from each role are already in your list
  - The AI may ask follow-up questions for additional context (industry, seniority level, specific domain) to provide more accurate recommendations
  - Once skills are recommended, you can select individual skills or add all skills from a role search at once
- **Generate by Company Size**: Generate realistic role breakdowns for companies based on their size. Enter the number of employees, review the generated roles, then generate skills for all roles at once. Perfect for creating large skill datasets for MVP testing. See the "Company Size Generation Feature" section below for details.
- **Selected Skills**: View and manage your selected skills
- **Transform & Export**: Transform skills using Claude and download as JSON

Simply navigate through the tabs to search, select, transform, and export your skills.

### CLI Tool

The CLI tool provides the following menu options:

1. **Search skills by keyword** - Search for skills using keywords
2. **Browse skills by type** - Browse skills filtered by type
3. **View selected skills** - See and manage your selected skills
4. **Transform selected skills and export** - Transform skills using Claude and export to JSON
5. **Exit** - Exit the application

### Workflow

1. Search, browse, or use AI recommendations to find skills you want to transform
   - **Search**: Enter keywords to search the Lightcast database
   - **Browse**: Explore skills by type using the interactive tree
   - **AI Recommendations**: Enter a role title and let AI recommend the top 6 skills. Answer any follow-up questions to refine recommendations.
2. Select skills from the results (in CLI: enter numbers like `1,3,5` or `all`)
3. View and manage your selected skills
4. Transform and export all selected skills to `people_protocol_skills.json`

### AI Recommendations Feature (Browse by Role)

The AI Recommendations feature uses your local Ollama instance to analyze role titles and recommend the most relevant skills. This feature is designed to help you build large skill lists (100s of skills) by searching multiple roles.

**How it works:**

1. **Enter Role Title**: Type the name of a role (e.g., "Data Scientist", "UX Designer", "DevOps Engineer", "Product Manager")
2. **AI Analysis**: The AI analyzes the role and either:
   - **Asks Follow-up Questions**: If more context would help (e.g., "What industry?", "What seniority level?"), the AI will ask specific questions
   - **Provides Recommendations**: If enough information is available, the AI immediately searches the Lightcast database and returns the top 6 recommended skills
3. **Answer Questions**: If asked, provide additional context by answering the AI's questions
4. **Build Your List**: 
   - **Add Individual Skills**: Select individual skills using checkboxes
   - **Add All Skills from a Role**: Click "Add All" to add all recommended skills from a role search to your selected list at once
   - **Search More Roles**: After getting recommendations, click "Search Another Role" to search for additional roles and accumulate more skills
5. **Role Search History**: All your role searches are saved in a history panel where you can:
   - See all roles you've searched and their recommended skills
   - Add all skills from any previous role search
   - Remove role searches you no longer need
   - See how many skills from each role are already in your selected list

**Building Large Skill Lists (100s of skills):**

To create a comprehensive skill list with 100s of skills:
1. Search for multiple related roles (e.g., "Senior Developer", "Junior Developer", "Tech Lead", "Architect")
2. For each role, add all recommended skills using the "Add All" button
3. Continue searching and adding skills from different roles
4. The system automatically prevents duplicate skills from being added
5. View your accumulated skills in the "Selected" tab
6. Transform and export when ready

**Note**: The AI recommendations feature requires Ollama to be running and configured (same as the transformation feature).

### Company Size Generation Feature

The Company Size Generation feature helps you quickly create large skill datasets for MVP testing by generating realistic role breakdowns based on company size.

**How it works:**

1. **Enter Company Size**: Type the number of employees in the company (e.g., 25, 50, 100, 200)
2. **Generate Roles**: Click "Generate Roles" to get a realistic breakdown of roles for that company size
   - The AI analyzes typical organizational structures for companies of that size
   - Generates role titles, counts, and descriptions
   - Considers industry-standard role distributions
3. **Review Roles**: Review the generated roles and their counts
   - See how many positions of each role type
   - Read descriptions for each role
   - Total positions should approximately match the company size
4. **Get Skills**: Click "Get Skills" to generate skills for all roles
   - The system processes each role sequentially
   - For each role, it generates the top 6 most relevant skills
   - All unique skills are automatically added to your selected skills list
   - Progress indicator shows which role is being processed
5. **Export**: Once skills are generated, go to "Transform & Export" to transform and download

**Example Workflow for MVP Testing:**

1. Enter company size: 25
2. Generate roles → Get roles like: CEO (1), CTO (1), Senior Engineers (3), Engineers (5), Product Manager (1), Designer (2), etc.
3. Review the 10-15 roles generated
4. Click "Get Skills" → System processes each role and adds ~60-90 unique skills to your list
5. Transform and export the complete skill set

**Use Cases:**
- Creating comprehensive skill datasets for testing
- Generating realistic skill profiles for different company sizes
- Building large skill libraries quickly
- MVP testing with diverse skill sets

**Note**: This feature requires Ollama to be running and configured. The role generation and skill generation both use your local Ollama instance.

## Output Format

The tool generates a JSON file with the following structure:

```json
{
  "framework": "People Protocol",
  "version": "1.0",
  "skills": [
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
  ]
}
```

### Proficiency Levels

Each skill includes behavioral statements across five levels:

- **Poor** (2-4 statements): Red flag behaviors—fundamental gaps or negative impact
- **Basic** (2-4 statements): Minimum acceptable standard, foundational competency
- **Intermediate** (2-4 statements): Solid proficiency, independent execution
- **Advanced** (3-5 statements): High mastery, strategic application, innovation
- **Exceptional** (1-3 statements): World-class, industry-leading expertise

## API Requirements

### Lightcast API
- Client credentials (Client ID and Client Secret)
- Access to the Skills API endpoint
- Scope: `emsi_open`

### Local Ollama
- [Ollama](https://ollama.com/) installed and running locally
- Model pulled (e.g., `ollama pull llama3.2`)
- Ollama server running on `http://localhost:11434` (default)
- Configure `OLLAMA_MODEL` in your `.env` file to match your installed model
- Configure `OLLAMA_BASE_URL` if your Ollama server runs on a different address

## Troubleshooting

**Authentication errors:**
- Verify your environment variables are set correctly
- Check that your API credentials are valid
- Ensure you have the necessary API access permissions

**Transformation errors:**
- Ensure Ollama is running (`ollama serve`)
- Verify the model is installed (`ollama list`)
- Check that `OLLAMA_BASE_URL` points to your Ollama server (default: `http://localhost:11434`)
- Ensure `OLLAMA_MODEL` matches an installed model name
- Check your internet connection (if Ollama is on a remote server)

## License

[Add your license here]


