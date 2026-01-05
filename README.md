# People Protocol Skill Builder

A Python CLI tool that fetches skills from the Lightcast API and transforms them into the People Protocol framework format using Claude (Anthropic).

## Overview

This tool helps you:
- Search and browse skills from the Lightcast API
- Select skills you want to transform
- Automatically generate behavioral statements across five proficiency levels using Claude AI
- Export skills in the People Protocol framework format

## Prerequisites

- Python 3.7 or higher
- Lightcast API credentials (Client ID and Client Secret)
- Anthropic API key (for Claude)

## Setup

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your credentials, or export them in your shell:
   ```bash
   export LIGHTCAST_CLIENT_ID="your_client_id"
   export LIGHTCAST_CLIENT_SECRET="your_client_secret"
   export ANTHROPIC_API_KEY="your_anthropic_key"
   ```

## Usage

Run the script:
```bash
python people_protocol_skill_builder.py
```

### Menu Options

1. **Search skills by keyword** - Search for skills using keywords
2. **Browse skills by type** - Browse skills filtered by type
3. **View selected skills** - See and manage your selected skills
4. **Transform selected skills and export** - Transform skills using Claude and export to JSON
5. **Exit** - Exit the application

### Workflow

1. Search or browse for skills you want to transform
2. Select skills from the results (enter numbers like `1,3,5` or `all`)
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

### Anthropic Claude API
- API key for Claude Sonnet 4 model access
- Account with sufficient credits for API calls

## Troubleshooting

**Authentication errors:**
- Verify your environment variables are set correctly
- Check that your API credentials are valid
- Ensure you have the necessary API access permissions

**Transformation errors:**
- Check your Anthropic API key and account status
- Verify you have sufficient API credits
- Check your internet connection

## License

[Add your license here]


