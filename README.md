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

1. Search or browse for skills you want to transform
2. Select skills from the results (in CLI: enter numbers like `1,3,5` or `all`)
3. View and manage your selected skills
4. Transform and export all selected skills to `people_protocol_skills.json`

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


