"""
Pagination utility for navigating to the next page on various websites.
This module provides utilities to detect and interact with pagination elements
across different website designs and structures.
"""

import re
import json
from time import sleep
from typing import Optional, List, Dict, Any, Callable

class PaginationHelper:
    """Helper class for detecting and clicking pagination elements on webpages."""
    
    def __init__(self, browser):
        """
        Initialize the pagination helper.
        
        Args:
            browser: Browser instance that provides access to the page
        """
        self.browser = browser
        
    def inspect_page_for_pagination(self):
        """
        Inspect the page to find potential pagination elements and print their details
        for debugging purposes.
        
        Returns:
            List of dictionaries containing information about potential pagination elements
        """
        # Get all potential pagination elements
        potential_elements = self.browser.page.evaluate("""() => {
            const results = [];
            
            // Look for elements with common pagination classes or attributes
            const selectors = [
                '.pagination', '.pager', '.page-numbers', '[role="navigation"]',
                'a[aria-label*="next"]', 'button[aria-label*="next"]',
                'a[rel="next"]',
                'button svg[class*="right"]',
                '.next', '.next-page', '[class*="pagination"]'
            ];
            
            // Find all elements matching the selectors
            const elements = [];
            for (const selector of selectors) {
                try {
                    const found = document.querySelectorAll(selector);
                    if (found.length > 0) {
                        elements.push(...found);
                    }
                } catch (e) {
                    // Skip invalid selectors
                }
            }
            
            // Look for links or buttons with text containing "next"
            const allLinksAndButtons = document.querySelectorAll('a, button');
            for (const el of allLinksAndButtons) {
                const text = el.textContent.toLowerCase();
                if (text.includes('next') || text.includes('nästa') || 
                    text.includes('forward') || text.includes('→')) {
                    elements.push(el);
                }
            }
            
            // Look for numeric pagination
            const pageNumbers = document.querySelectorAll('a[href*="page="], a[href*="/page/"]');
            if (pageNumbers.length > 0) {
                results.push({
                    type: 'numeric_pagination',
                    count: pageNumbers.length,
                    hrefs: Array.from(pageNumbers).map(el => el.getAttribute('href')).slice(0, 5)
                });
            }
            
            // Record information about the found elements
            const uniqueElements = [...new Set(elements)];
            for (const el of uniqueElements.slice(0, 10)) { // Limit to first 10 to avoid too much data
                const rect = el.getBoundingClientRect();
                results.push({
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    text: el.textContent.trim().slice(0, 30) + (el.textContent.length > 30 ? '...' : ''),
                    href: el.tagName === 'A' ? el.getAttribute('href') : null,
                    aria: {
                        label: el.getAttribute('aria-label'),
                        role: el.getAttribute('role')
                    },
                    visible: rect.width > 0 && rect.height > 0 && 
                             getComputedStyle(el).display !== 'none' && 
                             getComputedStyle(el).visibility !== 'hidden',
                    attributes: Array.from(el.attributes)
                        .filter(attr => !['class', 'id', 'href', 'style'].includes(attr.name))
                        .map(attr => `${attr.name}="${attr.value}"`)
                });
            }
            
            return results;
        }""")
        
        print("\nPotential pagination elements found:")
        for i, element in enumerate(potential_elements):
            print(f"Element {i+1}:")
            print(json.dumps(element, indent=2))
        
        return potential_elements

    def find_next_page_button(self, debug: bool = False) -> bool:
        """
        Find and click the next page button using various strategies.
        
        Args:
            debug: Whether to print detailed debug information
            
        Returns:
            True if successfully found and clicked a next page button, False otherwise
        """
        # First inspect the page to help with debugging if requested
        if debug:
            pagination_info = self.inspect_page_for_pagination()
        
        # Strategy 1: By role and name containing "next" or similar terms
        if self._try_role_matching():
            return True
            
        # Strategy 2: By text content
        if self._try_text_matching():
            return True
            
        # Strategy 3: By CSS selectors
        if self._try_css_selectors():
            return True
            
        # Strategy 4: By URL pattern
        if self._try_url_pagination():
            return True
            
        # Strategy 5: By JavaScript evaluation
        if self._try_javascript_evaluation():
            return True
            
        # Strategy 6: Try infinite scroll
        if self._try_infinite_scroll():
            return True
            
        print("No next page button found with any strategy")
        return False
    
    def _try_role_matching(self) -> bool:
        """Try to find next page buttons by role and name."""
        # Patterns for next buttons in various languages
        patterns = [
            "next", "Next", "nästa", "forward", "→", ">", "siguiente", "prochain", 
            "nächste", "prossimo", "volgende", "neste", "further", "more"
        ]
        regex_pattern = re.compile("|".join(patterns), re.IGNORECASE)
        
        # Try buttons
        next_buttons = self.browser.page.get_by_role("button", name=regex_pattern)
        if next_buttons.count() > 0:
            print(f"Found {next_buttons.count()} next buttons by role")
            next_buttons.first.click()
            return True

        # Try links
        next_links = self.browser.page.get_by_role("link", name=regex_pattern)
        if next_links.count() > 0:
            print(f"Found {next_links.count()} next links by text")
            next_links.first.click()
            return True
            
        return False
    
    def _try_text_matching(self) -> bool:
        """Try to find next page elements by their text content."""
        text_patterns = [
            "next page", "next", ">>", "→", ">", "nästa", "next results", 
            "show more", "load more", "view more", "more results"
        ]
        
        for pattern in text_patterns:
            elements = self.browser.page.get_by_text(re.compile(pattern, re.IGNORECASE))
            if elements.count() > 0:
                visible_elements = self.browser.page.evaluate("""(selector) => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        const visibleElements = Array.from(elements).filter(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 && 
                                   getComputedStyle(el).display !== 'none' && 
                                   getComputedStyle(el).visibility !== 'hidden';
                        });
                        return visibleElements.length;
                    } catch (e) {
                        return 0;
                    }
                }""", elements.nth(0).evaluate("el => el.tagName"))
                
                if visible_elements > 0:
                    print(f"Found {elements.count()} elements with text '{pattern}'")
                    try:
                        elements.first.click()
                        return True
                    except Exception as e:
                        print(f"Failed to click element with text '{pattern}': {e}")
                        # Try to click its parent if the element itself isn't clickable
                        try:
                            self.browser.page.evaluate("""(selector) => {
                                const element = document.querySelector(selector);
                                if (element && element.parentElement) {
                                    element.parentElement.click();
                                    return true;
                                }
                                return false;
                            }""", elements.first.evaluate("el => el.tagName"))
                            return True
                        except:
                            pass
        return False
    
    def _try_css_selectors(self) -> bool:
        """Try to find next page elements using CSS selectors."""
        # Common selectors for next page buttons
        selectors = [
            "a[aria-label*='next' i], a[aria-label*='Next' i], a[aria-label*='nästa' i]",
            "button[aria-label*='next' i], button[aria-label*='Next' i], button[aria-label*='nästa' i]",
            ".pagination-next, .next, .next-page, .pagination-arrow-next",
            "i.fa-chevron-right, i.fa-arrow-right, svg[class*='arrow-right'], svg[class*='chevron-right']",
            "[class*='next']:not([disabled])",
            "[class*='Next']:not([disabled])",
            "[class*='arrow-right'], [class*='chevron-right']",
            "a[rel='next']",
            "li.next a, li.Next a",
            "span.next-icon",
            "[data-testid*='next' i], [data-testid*='pagination-next' i]",
            "a[href*='page='], button[data-page]"
        ]
        
        for selector in selectors:
            try:
                elements = self.browser.page.locator(selector)
                if elements.count() > 0:
                    print(f"Found {elements.count()} next elements with selector: {selector}")
                    try:
                        elements.first.click()
                        return True
                    except Exception as e:
                        print(f"Failed to click using selector {selector}: {e}")
            except Exception as e:
                print(f"Invalid selector {selector}: {e}")
                
        # Try to find icons within buttons
        try:
            next_icons = self.browser.page.locator("button svg[class*='arrow'], button svg[class*='right'], button i[class*='right']")
            if next_icons.count() > 0:
                print(f"Found {next_icons.count()} buttons with right arrow icons")
                next_icons.first.click()
                return True
        except Exception as e:
            print(f"Error trying icon buttons: {e}")
            
        # Try pagination containers
        try:
            pagination = self.browser.page.locator(".pagination, .pager, .page-numbers, [role='navigation'], [class*='pagination']")
            if pagination.count() > 0:
                print("Found pagination container")
                # Find the active/current page number
                active = pagination.locator(".active, .current, [aria-current='page'], .selected, [aria-selected='true']").first
                # Get the next sibling that's a link or button
                next_page = active.locator("xpath=./following-sibling::*[self::a or self::button][1]")
                if next_page.count() > 0:
                    print("Found next page by pagination")
                    next_page.click()
                    return True
        except Exception as e:
            print(f"Error trying pagination: {e}")
        
        # Load more buttons
        load_more_selectors = [
            "button:text('more')",
            "button:text('load more')",
            "button:text('show more')",
            "a:text('more')",
            "a:text('load more')",
            "a:text('show more')",
            "[class*='load-more']", 
            "[class*='show-more']", 
            "[id*='load-more']",
            "[aria-label*='load more' i]",
            "button.more, a.more"
        ]
        
        for selector in load_more_selectors:
            try:
                elements = self.browser.page.locator(selector)
                if elements.count() > 0:
                    print(f"Found {elements.count()} load more elements with selector: {selector}")
                    try:
                        elements.first.click()
                        return True
                    except Exception as e:
                        print(f"Failed to click load more using selector {selector}: {e}")
            except Exception as e:
                print(f"Invalid load more selector {selector}: {e}")
                
        return False
    
    def _try_url_pagination(self) -> bool:
        """Try to navigate to the next page by modifying the URL."""
        try:
            current_url = self.browser.page.url
            # Parse page from URL
            current_page = 1
            page_param_match = re.search(r'[?&]page=(\d+)', current_url)
            if page_param_match:
                current_page = int(page_param_match.group(1))
                next_page = current_page + 1
                next_url = re.sub(r'([?&])page=\d+', f'\\1page={next_page}', current_url)
                
                if next_url != current_url:
                    print(f"Found pagination in URL, navigating from page {current_page} to {next_page}")
                    self.browser.OpenPage(next_url)
                    return True
            
            # Check for /page/X pattern
            page_path_match = re.search(r'/page/(\d+)', current_url)
            if page_path_match:
                current_page = int(page_path_match.group(1))
                next_page = current_page + 1
                next_url = re.sub(r'/page/\d+', f'/page/{next_page}', current_url)
                
                if next_url != current_url:
                    print(f"Found pagination in URL path, navigating from page {current_page} to {next_page}")
                    self.browser.OpenPage(next_url)
                    return True
        except Exception as e:
            print(f"Error trying URL pagination: {e}")
            
        return False
    
    def _try_javascript_evaluation(self) -> bool:
        """Try to find next page elements using JavaScript."""
        try:
            has_next = self.browser.page.evaluate("""() => {
                // Try to find and click any element that looks like a next page button
                
                // Helper function to check if an element is visible
                function isVisible(el) {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && 
                           getComputedStyle(el).display !== 'none' && 
                           getComputedStyle(el).visibility !== 'hidden';
                }
                
                // First check common pagination patterns
                const paginationElements = document.querySelectorAll('.pagination, .pager, nav[aria-label*="pagination" i], [class*="pagination"]');
                for (const pagination of paginationElements) {
                    if (!isVisible(pagination)) continue;
                    
                    // Try to find non-disabled next buttons within pagination
                    const nextBtn = pagination.querySelector('a:not([disabled])[aria-label*="next" i], button:not([disabled])[aria-label*="next" i], a.next, a[rel="next"], li.next a');
                    if (nextBtn && isVisible(nextBtn)) {
                        nextBtn.click();
                        return true;
                    }
                    
                    // Try to find numeric links and click the one after active
                    const activeLink = pagination.querySelector('a.active, a.current, li.active a, li.current a');
                    if (activeLink) {
                        // Find the next numeric sibling
                        let nextElement = activeLink.nextElementSibling;
                        while (nextElement) {
                            if (nextElement.tagName === 'A' && isVisible(nextElement)) {
                                nextElement.click();
                                return true;
                            }
                            nextElement = nextElement.nextElementSibling;
                        }
                    }
                }
                
                // Find anything with "next" in text or aria-label that looks clickable
                const allElements = document.querySelectorAll('a, button, [role="button"], [tabindex="0"]');
                const nextTextElements = Array.from(allElements).filter(el => {
                    if (!isVisible(el)) return false;
                    
                    const text = (el.textContent || '').toLowerCase();
                    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                    
                    return text.includes('next') || 
                           text.includes('more') || 
                           text.includes('show more') || 
                           text.includes('load more') ||
                           text.includes('→') || 
                           text.includes('>') || 
                           ariaLabel.includes('next') || 
                           ariaLabel.includes('forward');
                });
                
                if (nextTextElements.length > 0) {
                    nextTextElements[0].click();
                    return true;
                }
                
                return false;
            }""")
            
            if has_next:
                print("Found and clicked next button via JavaScript evaluation")
                return True
        except Exception as e:
            print(f"Error in JavaScript evaluation: {e}")
            
        return False
    
    def _try_infinite_scroll(self) -> bool:
        """Try to activate infinite scroll functionality."""
        try:
            # Scroll down to try to trigger infinite loading
            current_height = self.browser.page.evaluate("() => document.body.scrollHeight")
            
            # Scroll to bottom
            self.browser.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            print("Scrolled to bottom of page to check for infinite loading")
            
            # Wait a bit for potential content to load
            sleep(3)
            
            # Check if height increased
            new_height = self.browser.page.evaluate("() => document.body.scrollHeight")
            if new_height > current_height:
                print(f"Infinite scroll detected - page height increased from {current_height} to {new_height}")
                return True
                
            # Look for "load more" buttons that might have appeared
            load_more_button = self.browser.page.get_by_role("button", name=re.compile("load more|show more|view more|more results", re.IGNORECASE))
            if load_more_button.count() > 0:
                print("Found load more button after scrolling")
                load_more_button.first.click()
                return True
                
            return False
        except Exception as e:
            print(f"Error checking for infinite scroll: {e}")
            return False

def go_to_next_page(browser, debug: bool = False) -> bool:
    """
    Find and navigate to the next page.
    
    Args:
        browser: The browser object with an active page
        debug: Whether to print detailed debug information
        
    Returns:
        True if successfully navigated to the next page, False otherwise
    """
    helper = PaginationHelper(browser)
    return helper.find_next_page_button(debug=debug) 