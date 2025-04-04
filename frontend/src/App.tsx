import React from 'react';
import styled from 'styled-components';
import ChatInterface from './components/ChatInterface';

const AppContainer = styled.div`
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
`;

const Header = styled.header`
  background-color: #282c34;
  padding: 20px;
  color: white;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 2em;
`;

const Subtitle = styled.p`
  margin: 10px 0 0;
  font-size: 1.2em;
  opacity: 0.8;
`;

function App() {
  return (
    <AppContainer>
      <Header>
        <Title> Furniture Recommendation Chatbot</Title>
        <Subtitle>Find your perfect furniture match with AI</Subtitle>
      </Header>
      <ChatInterface />
    </AppContainer>
  );
}

export default App;
