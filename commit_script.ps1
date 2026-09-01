git init

# Configure git to ensure commits link to the GitHub profile
git config user.name "Myself-Praveen"
git config user.email "Myself-Praveen@users.noreply.github.com"

# Array of files/folders to commit sequentially
$items = @(
    ".gitignore",
    "README.md",
    "requirements.txt",
    "pyproject.toml",
    "docker-compose.yml",
    "chaos_monkey.sh",
    "backend/main.py",
    "backend/models.py",
    "backend/database.py",
    "backend/dag.py",
    "backend/qa_agent.py",
    "backend/forecast.py",
    "backend/agents",
    "backend/synth",
    "frontend/package.json",
    "frontend/src/app",
    "frontend/src/components",
    "."
)

$commit_messages = @(
    "chore: Add gitignore",
    "docs: Add comprehensive README",
    "chore: Add python requirements",
    "chore: Add pyproject.toml",
    "chore: Add docker-compose configuration",
    "test: Add chaos monkey script for crash recovery demo",
    "feat: Setup FastAPI main application",
    "feat: Define core pydantic models",
    "feat: Implement WAL SQLite database layer",
    "feat: Implement concurrent DAG orchestrator",
    "feat: Add NLP QA Agent",
    "feat: Add cash forecaster with exception awareness",
    "feat: Implement reconciliation agents (Exact, Fuzzy, Debate)",
    "test: Add synthetic data generator and adversarial edge cases",
    "chore: Add frontend package configuration",
    "feat: Implement Next.js app pages and routing",
    "feat: Add React UI components (DebatePanel, ConfidenceBar)",
    "feat: Final polish and tests"
)

for ($i = 0; $i -lt $items.Length; $i++) {
    git add $items[$i]
    git commit -m $commit_messages[$i]
}

# Set branch to main
git branch -M main

# Add remote
git remote add origin https://github.com/Myself-Praveen/Razorpay-SettleAI.git

# Try to push with force to overwrite the previous history
git push -u origin main --force
