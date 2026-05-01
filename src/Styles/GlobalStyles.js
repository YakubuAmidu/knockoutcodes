import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle`
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Inter", "Segoe UI", Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    background: ${({ theme }) => theme.colors.darkBrown};
    color: ${({ theme }) => theme.colors.white};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  a { color: inherit; text-decoration: none; }
  img { max-width: 100%; display: block; }
  button { font: inherit; cursor: pointer; border: 0; background: transparent; }

  .container {
    width: min(${({ theme }) => theme.layout.max}, ${({ theme }) => theme.layout.gutter});
    margin: 0 auto;
    padding: 0 1rem;
  }

  @media (hover:hover) {
    .hover-raise { transition: transform .2s ease, box-shadow .25s ease; }
    .hover-raise:hover { transform: translateY(-2px); box-shadow: ${({ theme }) => theme.shadow.hard}; }
  }
`;

export default GlobalStyles;
