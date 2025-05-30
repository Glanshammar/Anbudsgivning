import os
import sys
import asyncio
from pathlib import Path
from typing import Dict, Any
from urllib.parse import urlparse

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from playwright.async_api import async_playwright, TimeoutError

# Add parent directory to path to import from root
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

MODEL_NAME = "THUDM/chatglm3-6b"

class ChatGLMRedditSummarizer:
    def __init__(self, model_name: str = MODEL_NAME):
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4"
        )
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            trust_remote_code=True,
            quantization_config=bnb_config,
            device_map="auto"
        )

    def summarize(self, text: str, max_new_tokens: int = 256) -> str:
        prompt = f"Summarize the following Reddit thread:\n\n{text}"
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_new_tokens=max_new_tokens)
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response

async def fetch_reddit_thread_content(url: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until='networkidle', timeout=20000)
        await page.wait_for_timeout(2000)

        # Try to extract the main post content
        # Reddit's post content is usually in a div with data-test-id="post-content"
        try:
            post = await page.wait_for_selector('div[data-test-id="post-content"]', timeout=5000)
            post_text = await post.inner_text()
        except TimeoutError:
            post_text = "(Could not extract main post content)"

        # Optionally, extract top comment
        try:
            comment = await page.wait_for_selector('div[data-test-id="comment"]', timeout=3000)
            comment_text = await comment.inner_text()
        except TimeoutError:
            comment_text = ""

        await browser.close()
        content = post_text
        if comment_text:
            content += f"\n\nTop comment:\n{comment_text}"
        return content

async def main():
    # Example Reddit thread (can be replaced with any thread URL)
    reddit_url = "https://www.reddit.com/r/dotnet/comments/1kyud4f/seeking_topic_suggestions_for_a_net_session_with/"
    print(f"Fetching Reddit thread: {reddit_url}")
    thread_content = await fetch_reddit_thread_content(reddit_url)
    print("\nExtracted thread content (truncated):\n", thread_content[:500], "...\n")

    summarizer = ChatGLMRedditSummarizer()
    summary = summarizer.summarize(thread_content)
    print("\nSummary:\n", summary)

if __name__ == "__main__":
    asyncio.run(main()) 