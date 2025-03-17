from database import db_main, db_users
from domain import domain_main
import requests

if __name__ == "__main__":
    while True:
        command = input(">> ")
        if command.lower() == "docs":
            db_main()
        elif command.lower() == "users":
            db_users()
        elif command.lower() == "status":
            response = requests.get("http://127.0.0.1:5000/status")
            if response.status_code == 200:
                print('Status: Online')
                print("Message:", response.json()["message"])
            else:
                print(f"Unexpected status code: {response.status_code}")
        elif command.lower() == "domain":
            domain_main('C:/Users/Mondus/Documents/Länkar.txt')
        elif command.lower() == "exit":
            break
        else:
            print("Invalid command. Please try again.")