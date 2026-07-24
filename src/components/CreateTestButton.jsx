import React from 'react';
import styled from 'styled-components';

const Button = () => {
  return (
    <StyledWrapper>
      <button className="pb-ai-button">
        <span>Create Test Module</span>
        <span className="pb-ai-sparkle">✦</span>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;

  .pb-ai-button,
  .pb-ai-button * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: "Outfit", sans-serif;
  }

  .pb-ai-button {
    position: relative;
    width: 100%;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    border: none;
    outline: none;
    cursor: pointer;

    padding: 18px 72px;
    border-radius: 24px;

    color: #fff;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.4px;

    background: linear-gradient(180deg, #60A5FA 0%, #2563EB 45%, #1D4ED8 100%);

    box-shadow:
      0 0 0 6px rgba(37, 99, 235, 0.12),
      0 10px 30px rgba(37, 99, 235, 0.35),
      inset 0 2px 10px rgba(255, 255, 255, 0.22);

    overflow: hidden;
    isolation: isolate;

    transition:
      transform 0.3s ease,
      box-shadow 0.3s ease;
  }

  /* Top gloss */
  .pb-ai-button::before {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: inherit;

    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.22),
      rgba(255, 255, 255, 0.05) 45%,
      rgba(255, 255, 255, 0)
    );

    z-index: 1;
    pointer-events: none;
  }

  /* Grain + bottom glow */
  .pb-ai-button::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;

    background-image: radial-gradient(
        circle at bottom center,
        rgba(255, 255, 255, 0.42) 0%,
        rgba(255, 255, 255, 0.18) 18%,
        rgba(255, 255, 255, 0.06) 35%,
        transparent 65%
      ),
      radial-gradient(rgba(255, 255, 255, 0.14) 0.8px, transparent 0.8px),
      radial-gradient(rgba(255, 255, 255, 0.08) 0.5px, transparent 0.5px),
      radial-gradient(rgba(0, 0, 0, 0.08) 0.7px, transparent 0.7px);

    background-size:
      100% 100%,
      4px 4px,
      7px 7px,
      5px 5px;

    background-position:
      center,
      0 0,
      2px 2px,
      1px 3px;

    opacity: 0.55;
    mix-blend-mode: overlay;

    z-index: 2;
    pointer-events: none;
  }

  .pb-ai-button span {
    position: relative;
    z-index: 3;
  }

  .pb-ai-sparkle {
    font-size: 18px;
    transform: translateY(-1px);
  }

  .pb-ai-button:hover {
    transform: translateY(-2px) scale(1.02);

    box-shadow:
      0 0 0 10px rgba(37, 99, 235, 0.16),
      0 16px 40px rgba(37, 99, 235, 0.42),
      inset 0 2px 10px rgba(255, 255, 255, 0.28);
  }

  .pb-ai-button:active {
    transform: scale(0.98);
  }`;

export default Button;
