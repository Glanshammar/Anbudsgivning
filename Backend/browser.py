import json
import math
import datetime
from typing import List, Dict
import os
from time import sleep
from playwright.sync_api import sync_playwright, Page, Browser as PlaywrightBrowser, ElementHandle, TimeoutError, Error


class Browser:
    def __init__(self):
        self.playwright = None
        self.browser_instance = None
        self.context = None
        self.page = None
        self.max_retries = 3
        self.retry_delay = 2

    def Start(self):
        if self.browser_instance is None:
            try:
                self.playwright = sync_playwright().start()
                self.browser_instance = self.playwright.chromium.launch(
                    headless=True,
                    args=[
                        '--no-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-extensions',
                        '--disable-infobars'
                    ]
                )
                self.context = self.browser_instance.new_context(viewport={"width": 1920, "height": 1080})
                self.page = self.context.new_page()
                self.page.set_default_timeout(30000)  # 30 seconds timeout
            except Exception as e:
                print(f"Error starting browser: {str(e)}")
                raise
        return self.page

    def Quit(self):
        if self.browser_instance:
            try:
                if self.context:
                    self.context.close()
                self.browser_instance.close()
                if self.playwright:
                    self.playwright.stop()
            except Exception as e:
                print(f"Error quitting browser: {str(e)}")
            finally:
                self.browser_instance = None
                self.context = None
                self.page = None
                self.playwright = None

    def EnsureBrowserStarted(self):
        """Ensure browser is started and session is valid."""
        if self.browser_instance is None or self.page is None:
            self.Start()
        try:
            # Try a simple operation to check if session is valid
            self.page.url
        except Error:
            # Session is invalid, restart browser
            self.Quit()
            self.Start()

    def OpenPage(self, url: str, wait_time: int = 5):
        """Open a page with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                self.page.goto(url, wait_until="domcontentloaded")
                sleep(wait_time)  # Additional wait time as specified
                return
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def GetLinks(self) -> List[str]:
        """Get all links from current page with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                link_elements = self.page.query_selector_all("a[href]")
                links = []
                for link in link_elements:
                    href = link.get_attribute("href")
                    if href:
                        links.append(href)
                return links
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def GetLinksFromPage(self, url: str) -> List[str]:
        """Get all links from a specific page with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.OpenPage(url)
                return self.GetLinks()
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)

    def WaitForElement(self, selector: str, timeout: int = 10000):
        """Wait for an element with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                return self.page.wait_for_selector(selector, timeout=timeout)
            except (Error, TimeoutError) as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def __enter__(self):
        self.Start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.Quit()

    def GetElementText(self, selector: str) -> str:
        """Get text content of an element."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                element = self.page.query_selector(selector)
                if element:
                    return element.text_content() or ""
                return ""
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def GetElementAttribute(self, selector: str, attribute: str) -> str:
        """Get attribute value of an element."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                element = self.page.query_selector(selector)
                if element:
                    return element.get_attribute(attribute) or ""
                return ""
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def TakeScreenshot(self, path: str = None) -> bytes:
        """Take a screenshot of the current page."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                if path:
                    return self.page.screenshot(path=path)
                else:
                    return self.page.screenshot()
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def WaitForNetworkIdle(self, timeout: int = 5000):
        """Wait for network activity to be idle."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                self.page.wait_for_load_state("networkidle", timeout=timeout)
                return
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def Click(self, selector: str, timeout: int = 5000):
        """Click on an element."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                self.page.click(selector, timeout=timeout)
                return
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()

    def Fill(self, selector: str, value: str, timeout: int = 5000):
        """Fill a form field."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                self.page.fill(selector, value, timeout=timeout)
                return
            except Error as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)
                self.EnsureBrowserStarted()
