import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

const Container = styled.div`
  display: flex;
  height: 100vh;
  background: #f5f5f5;
`;

const Sidebar = styled.div`
  width: 250px;
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  overflow-y: auto;
`;

const ChatList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ChatItem = styled.div<{ active: boolean }>`
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  background: ${props => props.active ? '#e3f2fd' : 'transparent'};
  &:hover {
    background: #f5f5f5;
  }
`;

const NewChatButton = styled.button`
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #0056b3;
  }
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #ffffff;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Message = styled.div<{ role: 'user' | 'assistant' }>`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  align-items: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
`;

const MessageContent = styled.div<{ role: 'user' | 'assistant' }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 15px;
  background: ${props => props.role === 'user' ? '#007bff' : '#e3f2fd'};
  color: ${props => props.role === 'user' ? '#ffffff' : '#333333'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap;
  line-height: 1.5;
  
  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }
  
  li {
    margin: 4px 0;
  }
  
  p {
    margin: 8px 0;
  }
  
  h3, h4 {
    margin: 12px 0 8px 0;
  }
`;

const InputContainer = styled.div`
  display: flex;
  gap: 10px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 16px;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  &:hover {
    background: #0056b3;
  }
  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const formatMessage = (content: string) => {
  // Replace bullet points with proper HTML
  content = content.replace(/\n•/g, '\n• ');
  content = content.replace(/\n-/g, '\n- ');
  
  // Add spacing between paragraphs
  content = content.replace(/\n\n/g, '\n\n');
  
  // Format numbered lists
  content = content.replace(/\n\d+\./g, match => `\n${match}`);
  
  return content;
};

const ChatInterface: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
    };
    setChats(prev => [...prev, newChat]);
    setActiveChatId(newChat.id);
    setInput('');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeChatId) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setChats(prev => prev.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    ));
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input.trim(),
          chatId: activeChatId 
        }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: formatMessage(data.response),
      };

      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [...chat.messages, assistantMessage] }
          : chat
      ));
    } catch (error) {
      console.error('Error:', error);
      setChats(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.',
              }]
            }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeChat = chats.find(chat => chat.id === activeChatId);

  return (
    <Container>
      <Sidebar>
        <NewChatButton onClick={createNewChat}>
          New Chat
        </NewChatButton>
        <ChatList>
          {chats.map(chat => (
            <ChatItem
              key={chat.id}
              active={chat.id === activeChatId}
              onClick={() => {
                setActiveChatId(chat.id);
                setInput('');
              }}
            >
              {chat.title}
            </ChatItem>
          ))}
        </ChatList>
      </Sidebar>
      <ChatContainer>
        {activeChat ? (
          <>
            <MessagesContainer>
              {activeChat.messages.map((message, index) => (
                <Message key={index} role={message.role}>
                  <MessageContent role={message.role}>
                    {message.content}
                  </MessageContent>
                </Message>
              ))}
              <div ref={messagesEndRef} />
            </MessagesContainer>
            <InputContainer>
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </InputContainer>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h2>Welcome to IKEA Furniture Chatbot</h2>
            <p>Start a new chat to begin your furniture search!</p>
          </div>
        )}
      </ChatContainer>
    </Container>
  );
};

export default ChatInterface; 