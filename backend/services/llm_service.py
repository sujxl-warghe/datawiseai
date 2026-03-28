import os
import json
import httpx
from groq import Groq
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are DataWise, an expert AI data analyst. You help users analyze their data by:
1. Understanding their natural language questions
2. Generating precise SQL queries for DuckDB (table is always called 'uploaded_data')
3. Interpreting query results and providing clear insights

## Rules:
- Always generate valid DuckDB SQL. The table is ALWAYS named `uploaded_data`.
- Return ONLY a JSON object with exactly these fields:
  {
    "sql": "<DuckDB SQL query>",
    "explanation": "<brief explanation of what the query does>",
    "insight": "<interpretation of the expected results or analytical insight>"
  }
- Use proper DuckDB syntax (e.g., strftime for dates, ILIKE for case-insensitive search)
- For aggregations, always use aliases
- If the question cannot be answered with SQL, set sql to null and explain in insight
- Keep explanations concise but helpful
- Never include markdown code blocks in your response, just raw JSON
"""


def get_groq_client(api_key: str) -> Groq:
    """Create Groq client with explicit httpx transport to avoid proxy issues."""
    try:
        # Try creating with explicit http_client to bypass proxy argument issue
        http_client = httpx.Client(
            transport=httpx.HTTPTransport(retries=2),
            timeout=60.0,
        )
        return Groq(api_key=api_key, http_client=http_client)
    except TypeError:
        # Fallback: plain init if http_client kwarg also unsupported
        return Groq(api_key=api_key)


async def generate_sql_and_insight(
    user_query: str,
    columns: list,
    schema_info: str,
    api_key: str,
    sample_data: Optional[str] = None,
) -> Tuple[Optional[dict], Optional[str]]:
    """Use LLM to convert natural language query to SQL and generate insight."""
    try:
        client = get_groq_client(api_key)

        context = f"""
Dataset Schema:
{schema_info}

Columns: {', '.join(columns)}

{f"Sample Data (first 3 rows):{chr(10)}{sample_data}" if sample_data else ""}

User Question: {user_query}

Remember: Return ONLY a raw JSON object, no markdown, no code blocks.
"""

        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": context},
            ],
            temperature=0.1,
        )

        content = response.choices[0].message.content.strip()

        # Strip markdown code blocks if model wraps response anyway
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()

        result = json.loads(content)
        return result, None

    except json.JSONDecodeError as e:
        return None, f"Failed to parse LLM response: {e}"
    except Exception as e:
        return None, f"LLM error: {str(e)}"


async def generate_insight_from_results(
    user_query: str,
    sql: str,
    results: list,
    api_key: str,
) -> str:
    """Generate a natural language insight from SQL results."""
    try:
        client = get_groq_client(api_key)

        results_str = json.dumps(results[:20], indent=2, default=str)

        prompt = f"""The user asked: "{user_query}"

SQL executed: {sql}

Results (up to 20 rows):
{results_str}

Provide a clear, concise analytical response in 2-4 sentences. Highlight key findings, patterns, or anomalies. Be specific with numbers where relevant."""

        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=300,
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"Results retrieved successfully. {len(results)} rows returned."


def build_schema_info(columns_meta: list) -> str:
    """Build a schema description string from column metadata."""
    lines = []
    for col in columns_meta:
        line = f"  - {col['name']} ({col['dtype']})"
        if col.get('missing', 0) > 0:
            line += f" [missing: {col['missing']}]"
        if col.get('min') is not None:
            line += f" [range: {col['min']} - {col['max']}]"
        lines.append(line)
    return "\n".join(lines)
