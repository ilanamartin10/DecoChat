import React from 'react';
import styled from 'styled-components';
import ChatInterface from '../ChatInterface';
import BackButton from '../BackButton';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const ChatPage: React.FC = () => {
  return (
    <PageContainer>
      <BackButton />
      <ChatInterface />
    </PageContainer>
  );
};

export default ChatPage; 