from Database.database import DBMain, db
from Database.users import UsersMain
from domain import DomainMain
import requests

if __name__ == "__main__":
    while True:
        command = input(">> ")
        if command.lower() == "docs":
            DBMain()
        elif command.lower() == "users":
            UsersMain()
        elif command.lower() == "status":
            response = requests.get("http://127.0.0.1:5000/status")
            if response.status_code == 200:
                print('Status: Online')
                print("Message:", response.json()["message"])
            else:
                print(f"Unexpected status code: {response.status_code}")
        elif command.lower() == "domain":
            DomainMain('C:/Users/Mondus/Documents/Länkar.txt')
        elif command.lower() == "exit":
            break
        else:
            print("Invalid command. Please try again.")