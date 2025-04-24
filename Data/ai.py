from openai import OpenAI
import os

def PromptAI(prompt:str):
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("AI_API_KEY")
    )
    response = client.chat.completions.create(
        model="microsoft/mai-ds-r1:free",
        messages=[{"role": "user",
                    "content": prompt}]
    )
    return response

mock_response = """Here is the list of tender notice pages following the pattern `/sv/notice/-/detail/{number}-{year}` from the provided links:
1. https://ted.europa.eu/sv/notice/-/detail/266375-2025  
2. https://ted.europa.eu/sv/notice/-/detail/266374-2025  
3. https://ted.europa.eu/sv/notice/-/detail/266372-2025  
4. https://ted.europa.eu/sv/notice/-/detail/266370-2025  
5. https://ted.europa.eu/sv/notice/-/detail/266367-2025  
6. https://ted.europa.eu/sv/notice/-/detail/266366-2025  
7. https://ted.europa.eu/sv/notice/-/detail/266365-2025  
8. https://ted.europa.eu/sv/notice/-/detail/266360-2025  
9. https://ted.europa.eu/sv/notice/-/detail/266353-2025  
10. https://ted.europa.eu/sv/notice/-/detail/266350-2025  
11. https://ted.europa.eu/sv/notice/-/detail/266342-2025  
12. https://ted.europa.eu/sv/notice/-/detail/266340-2025  
13. https://ted.europa.eu/sv/notice/-/detail/266337-2025  
14. https://ted.europa.eu/sv/notice/-/detail/266336-2025  
15. https://ted.europa.eu/sv/notice/-/detail/266334-2025  
16. https://ted.europa.eu/sv/notice/-/detail/266332-2025  
17. https://ted.europa.eu/sv/notice/-/detail/266331-2025  
18. https://ted.europa.eu/sv/notice/-/detail/266323-2025  
19. https://ted.europa.eu/sv/notice/-/detail/266322-2025  
20. https://ted.europa.eu/sv/notice/-/detail/266317-2025  
21. https://ted.europa.eu/sv/notice/-/detail/266312-2025  
22. https://ted.europa.eu/sv/notice/-/detail/266311-2025  
23. https://ted.europa.eu/sv/notice/-/detail/266306-2025  
24. https://ted.europa.eu/sv/notice/-/detail/266304-2025  
25. https://ted.europa.eu/sv/notice/-/detail/266302-2025  
26. https://ted.europa.eu/sv/notice/-/detail/266299-2025  
27. https://ted.europa.eu/sv/notice/-/detail/266298-2025  
28. https://ted.europa.eu/sv/notice/-/detail/266293-2025  
29. https://ted.europa.eu/sv/notice/-/detail/266292-2025  
30. https://ted.europa.eu/sv/notice/-/detail/266290-2025  
31. https://ted.europa.eu/sv/notice/-/detail/266285-2025  
32. https://ted.europa.eu/sv/notice/-/detail/266283-2025  
33. https://ted.europa.eu/sv/notice/-/detail/266277-2025  
34. https://ted.europa.eu/sv/notice/-/detail/266276-2025  
35. https://ted.europa.eu/sv/notice/-/detail/266272-2025  
36. https://ted.europa.eu/sv/notice/-/detail/266270-2025  
37. https://ted.europa.eu/sv/notice/-/detail/266262-2025  
38. https://ted.europa.eu/sv/notice/-/detail/266260-2025  
39. https://ted.europa.eu/sv/notice/-/detail/266258-2025  
40. https://ted.europa.eu/sv/notice/-/detail/266257-2025  
41. https://ted.europa.eu/sv/notice/-/detail/266256-2025  
42. https://ted.europa.eu/sv/notice/-/detail/266255-2025  
43. https://ted.europa.eu/sv/notice/-/detail/266254-2025  
44. https://ted.europa.eu/sv/notice/-/detail/266253-2025  
45. https://ted.europa.eu/sv/notice/-/detail/266248-2025  
46. https://ted.europa.eu/sv/notice/-/detail/266245-2025  
47. https://ted.europa.eu/sv/notice/-/detail/266241-2025  
48. https://ted.europa.eu/sv/notice/-/detail/266239-2025  
49. https://ted.europa.eu/sv/notice/-/detail/266238-2025  
50. https://ted.europa.eu/sv/notice/-/detail/266237-2025  

**Pattern Explanation**:  
All tender pages follow the format:  
`https://ted.europa.eu/{language}/notice/-/detail/{noticeID}-{year}`  
(e.g., `266375-2025` is a unique notice identifier with the publication year).  

Other URLs in the list relate to navigation, language options, legal pages, or EU institutional links and are excluded."""