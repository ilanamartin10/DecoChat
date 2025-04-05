import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const BackButtonContainer = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  margin-bottom: 20px;

  &:hover {
    background: #0056b3;
    transform: translateY(-2px);
  }
`;

const BackButton: React.FC = () => {
  return (
    <BackButtonContainer to="/">
      ← Back to Dashboard
    </BackButtonContainer>
  );
};

export default BackButton; 