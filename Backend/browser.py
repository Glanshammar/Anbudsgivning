import json
import math
import datetime
from typing import List, Dict
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException, TimeoutException
from openai import OpenAI
import os
from time import sleep


class Browser:
    def __init__(self):
        self.options = Options()

        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--disable-gpu')
        self.options.add_argument('--disable-extensions')
        self.options.add_argument('--disable-infobars')
        self.driver = None
        self.max_retries = 3
        self.retry_delay = 2

    def Start(self):
        if self.driver is None:
            try:
                self.driver = webdriver.Chrome(options=self.options)
                self.driver.maximize_window()
                self.driver.set_page_load_timeout(30)
            except Exception as e:
                print(f"Error starting browser: {str(e)}")
                raise
        return self.driver

    def Quit(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                print(f"Error quitting browser: {str(e)}")
            finally:
                self.driver = None

    def EnsureBrowserStarted(self):
        """Ensure browser is started and session is valid."""
        if self.driver is None:
            self.Start()
        try:
            # Try a simple operation to check if session is valid
            self.driver.current_url
        except WebDriverException:
            # Session is invalid, restart browser
            self.Quit()
            self.Start()

    def OpenPage(self, url: str, wait_time: int = 5):
        """Open a page with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                self.driver.get(url)
                sleep(wait_time)
                return
            except WebDriverException as e:
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
                link_elements = self.driver.find_elements(By.TAG_NAME, "a")
                return [link.get_attribute("href") for link in link_elements if link.get_attribute("href")]
            except WebDriverException as e:
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
            except WebDriverException as e:
                if attempt == self.max_retries - 1:
                    raise
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                sleep(self.retry_delay)

    def WaitForElement(self, by: By, value: str, timeout: int = 10):
        """Wait for an element with retry logic."""
        for attempt in range(self.max_retries):
            try:
                self.EnsureBrowserStarted()
                return WebDriverWait(self.driver, timeout).until(
                    EC.presence_of_element_located((by, value))
                )
            except (WebDriverException, TimeoutException) as e:
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
