import React from 'react';
import styled from 'styled-components';
import BackButton from '../BackButton';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
  margin-bottom: 20px;
`;

const MoodboardPage: React.FC = () => {
  return (
    <PageContainer>
      <BackButton />
      <Title>🎨 Moodboard</Title>
      <p>Coming soon...</p>
    </PageContainer>
  );
};

export default MoodboardPage; 