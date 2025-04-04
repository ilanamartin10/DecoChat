import json
import requests
from typing import List, Dict
import sys

class FurnitureChatbot:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.conversation_history: List[Dict[str, str]] = []

    def send_message(self, message: str) -> Dict:
        """Send a message to the chatbot and get the response."""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={"message": message}
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with the server: {e}")
            sys.exit(1)

    def print_response(self, response: Dict):
        """Print the chatbot's response in a formatted way."""
        print("\n🤖 DecoChat:")
        print(response['response'])

    def start_chat(self):
        """Start the interactive chat session."""
        print("\n🛋️ Welcome to the Furniture Recommendation Chatbot!")
        print("Type 'quit' or 'exit' to end the conversation.")
        print("Type 'reset' to start a new conversation.")
        print("Type 'help' to see these instructions again.\n")

        while True:
            try:
                user_input = input("\n👤 You: ").strip()
                
                if user_input.lower() in ['quit', 'exit']:
                    print("\n👋 Goodbye! Thanks for chatting!")
                    break
                
                if user_input.lower() == 'reset':
                    self.conversation_history = []
                    response = requests.delete(f"{self.base_url}/api/chat")
                    print("\n🔄 Conversation reset. Starting fresh!")
                    continue
                
                if user_input.lower() == 'help':
                    print("\n🎯 Available commands:")
                    print("  - 'quit' or 'exit': End the conversation")
                    print("  - 'reset': Start a new conversation")
                    print("  - 'help': Show these instructions")
                    print("\n💡 Example queries:")
                    print("  - 'I need a comfortable sofa for my living room'")
                    print("  - 'Show me some affordable dining tables'")
                    print("  - 'I'm looking for a desk that's at least 120cm wide'")
                    continue

                response = self.send_message(user_input)
                self.print_response(response)

            except KeyboardInterrupt:
                print("\n\n👋 Goodbye! Thanks for chatting!")
                break
            except Exception as e:
                print(f"\n❌ An error occurred: {e}")
                continue

if __name__ == "__main__":
    chatbot = FurnitureChatbot()
    chatbot.start_chat() 