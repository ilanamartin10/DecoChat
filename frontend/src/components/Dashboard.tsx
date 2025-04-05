import React from 'react';
import styled from 'styled-components';
import { Link, Outlet, useLocation } from 'react-router-dom';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
  padding: 40px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Logo = styled.h1`
  font-size: 48px;
  color: #007bff;
  margin-bottom: 20px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #666;
  margin-bottom: 40px;
`;

const CardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Card = styled(Link)`
  background: white;
  border-radius: 16px;
  padding: 30px;
  text-decoration: none;
  color: #333;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  }
`;

const CardIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
`;

const CardTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 10px;
  color: #007bff;
`;

const CardDescription = styled.p`
  color: #666;
  font-size: 16px;
`;

const Dashboard: React.FC = () => {
  const location = useLocation();
  
  // If we're not on the home page, render the content
  if (location.pathname !== '/') {
    return <Outlet />;
  }

  return (
    <DashboardContainer>
      <Header>
        <Logo>DecoChat</Logo>
        <Subtitle>Your all-in-one interior design assistant</Subtitle>
      </Header>
      <CardsContainer>
        <Card to="/chat">
          <CardIcon>💬</CardIcon>
          <CardTitle>Chat Assistant</CardTitle>
          <CardDescription>Get personalized furniture recommendations and design advice through our AI chat interface</CardDescription>
        </Card>
        <Card to="/moodboard">
          <CardIcon>🎨</CardIcon>
          <CardTitle>Moodboard</CardTitle>
          <CardDescription>Create and organize your design inspirations in one place</CardDescription>
        </Card>
        <Card to="/care-guide">
          <CardIcon>📚</CardIcon>
          <CardTitle>Care Guide</CardTitle>
          <CardDescription>Learn how to maintain and care for your furniture</CardDescription>
        </Card>
        <Card to="/plan-room">
          <CardIcon>📐</CardIcon>
          <CardTitle>Plan Your Room</CardTitle>
          <CardDescription>Visualize and plan your room layout with our interactive tools</CardDescription>
        </Card>
      </CardsContainer>
    </DashboardContainer>
  );
};

export default Dashboard; 