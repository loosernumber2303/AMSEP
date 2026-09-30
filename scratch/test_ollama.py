import httpx

payload = {
    "model": "qwen3.5:4b",
    "prompt": "Create a structured plan for 'Build a selection sort application' in JSON format with project_title and functional_requirements.",
    "stream": False,
    "format": "json"
}

try:
    print("Calling local Ollama with qwen3.5:4b...")
    res = httpx.post("http://127.0.0.1:11434/api/generate", json=payload, timeout=60.0)
    data = res.json()
    print("Response:")
    print(data.get("response"))
except Exception as e:
    print("Error:", e)
