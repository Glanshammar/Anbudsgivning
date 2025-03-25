from Data import UsersMain, DomainMain, Company, Consultant
from Agents import AgentManager, AgentType
import requests

if __name__ == "__main__":
    while True:
        command = input(">> ")
        if command.lower() == "consult":
            consultant_dummy_data = {
                "name": "Andreas Johansson",
                "expertise": ["Project Management", "Agile Methodologies", "IT Consulting"],
                "years_of_experience": 5,
                "certifications": ["Programming Cert", "IT Cert", "Azure AI-900"],
                "contact_email": "andreas@johansson.se",
                "contact_phone": "+46 72 356 77 71"
            }
            Consultant.AddConsultant(**consultant_dummy_data)
        elif command.lower() == "company":
            consultant_dummy_data = {
                "name": "Andreas Johansson",
                "expertise": ["Project Management", "Agile Methodologies", "IT Consulting"],
                "years_of_experience": 5,
                "certifications": ["Programming Cert", "IT Cert", "Azure AI-900"],
                "contact_email": "andreas@johansson.se",
                "contact_phone": "+46 72 356 77 71"
            }
            Consultant.AddConsultant(**consultant_dummy_data)
        elif command.lower() == "agent":
            manager = AgentManager()
        elif command.lower() == "status":
            response = requests.get("http://127.0.0.1:5000/status")
            if response.status_code == 200:
                print("Message:", response.json()["message"])
            else:
                print(f"Unexpected status code: {response.status_code}")
        elif command.lower() == "domain":
            DomainMain('C:/Users/Mondus/Documents/Länkar.txt')
        elif command.lower() == "exit":
            break
        else:
            print("Invalid command. Please try again.")