import os
import sys
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path
from urllib.parse import quote

# Add parent directory to path to import from root
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

from langchain_community.llms import Ollama
from playwright.async_api import async_playwright, TimeoutError

class BrowserUseTest:
    def __init__(self, model_name: str = "phi"):
        """Initialize the browser use test with specified model.
        
        Args:
            model_name: Name of the Ollama model to use
        """
        self.llm = Ollama(model=model_name)
        
    async def run_test(self, task: str) -> Dict[str, Any]:
        """Run a browser use test with the given task.
        
        Args:
            task: The task description for the browser agent
            
        Returns:
            Dict containing test results and metadata
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=False)
                page = await browser.new_page()
                
                # Use direct search URL
                search_term = 'runescape'
                search_url = f'https://www.reddit.com/search/?q={quote(search_term)}'
                print(f"Navigating to search URL: {search_url}")
                
                # Navigate to search results
                await page.goto(search_url, wait_until='networkidle', timeout=15000)
                
                # Debug: Print page title and URL
                print(f"Page title: {await page.title()}")
                print(f"Current URL: {page.url}")
                
                # Wait for search results to load
                await page.wait_for_load_state('networkidle', timeout=15000)
                await page.wait_for_timeout(2000)  # Additional wait for dynamic content
                
                # Try to find posts using the specific XPath patterns
                post_xpaths = [
                    '//*[@id="main-content"]/div/search-telemetry-tracker[1]',
                    '//*[@id="main-content"]/div/search-telemetry-tracker[2]',
                    '//*[@id="main-content"]/div/search-telemetry-tracker[3]',
                    '//*[@id="main-content"]/div/search-telemetry-tracker[4]'
                ]
                
                first_post = None
                for xpath in post_xpaths:
                    try:
                        print(f"Trying to find post with XPath: {xpath}")
                        first_post = await page.wait_for_selector(f"xpath={xpath}", timeout=5000)
                        if first_post:
                            print(f"Found post with XPath: {xpath}")
                            break
                    except TimeoutError:
                        print(f"XPath not found: {xpath}")
                        continue
                
                if first_post:
                    # Get the post content
                    content = await first_post.text_content()
                    print(f"Post content length: {len(content)} characters")
                    
                    # Use LLM to summarize
                    prompt = f"Summarize this Reddit post:\n\n{content}"
                    summary = self.llm.invoke(prompt)
                    
                    await browser.close()
                    
                    return {
                        "status": "success",
                        "task": task,
                        "result": summary,
                        "model": self.llm.model
                    }
                else:
                    await browser.close()
                    return {
                        "status": "error",
                        "task": task,
                        "error": "No posts found in search results",
                        "model": self.llm.model
                    }
            
        except Exception as e:
            return {
                "status": "error",
                "task": task,
                "error": str(e),
                "model": self.llm.model
            }

async def main():
    """Main test function to demonstrate browser use capabilities."""
    test = BrowserUseTest(model_name="phi")
    
    # Example task
    task = "Go to Reddit, search for 'runescape', and summarize the first post."
    
    result = await test.run_test(task)
    
    print("\nTest Results:")
    print(f"Status: {result['status']}")
    print(f"Task: {result['task']}")
    if result['status'] == 'success':
        print(f"Result: {result['result']}")
    else:
        print(f"Error: {result['error']}")
    print(f"Model used: {result['model']}")

if __name__ == "__main__":
    asyncio.run(main())
