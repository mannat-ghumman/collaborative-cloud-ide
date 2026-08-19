export type FileType =
  | "typescript"
  | "typescriptreact"
  | "json"
  | "markdown";

export interface IDEFile {
  name: string;
  path: string;
  language: FileType;
  content: string;
}

export const defaultFiles: IDEFile[] = [
  {
    name: "App.tsx",
    path: "src/App.tsx",
    language: "typescriptreact",
    content: `function App() {
  return (
    <div>
      <h1>Hello CloudIDE</h1>
    </div>
  );
}

export default App;
`,
  },

  {
    name: "main.tsx",
    path: "src/main.tsx",
    language: "typescriptreact",
    content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  },

  {
    name: "package.json",
    path: "package.json",
    language: "json",
    content: `{
  "name": "cloud-ide",
  "version": "1.0.0",
  "private": true
}
`,
  },

  {
    name: "README.md",
    path: "README.md",
    language: "markdown",
    content: `# CloudIDE

A collaborative cloud development environment.

## Features

- Browser-based editor
- Real-time collaboration
- Cloud workspaces
- Git integration
`,
  },
];