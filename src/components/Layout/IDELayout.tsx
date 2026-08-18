import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

import {
  defaultFiles,
  type IDEFile,
} from "../../data/defaultFiles";

function getLanguageFromFileName(
  fileName: string
): IDEFile["language"] {
  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  switch (extension) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return "typescript";

    case "json":
      return "json";

    case "md":
      return "markdown";

    default:
      return "typescript";
  }
}

function IDELayout() {
  const [files, setFiles] =
    useState<IDEFile[]>(defaultFiles);

  const [activeFilePath, setActiveFilePath] =
    useState(defaultFiles[0].path);

  const [openFiles, setOpenFiles] =
    useState<string[]>([
      defaultFiles[0].path,
    ]);

  const [modifiedFiles, setModifiedFiles] =
    useState<string[]>([]);

  const activeFile = files.find(
    (file) =>
      file.path === activeFilePath
  );

  // -----------------------------
  // Save
  // -----------------------------

  const handleSave = () => {
    if (!activeFile) return;

    setModifiedFiles((current) =>
      current.filter(
        (path) =>
          path !== activeFile.path
      )
    );

    console.log(
      `Saved: ${activeFile.path}`
    );
  };

  // -----------------------------
  // Ctrl + S
  // -----------------------------

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [activeFile]);

  // -----------------------------
  // Create file
  // -----------------------------

  const handleCreateFile = () => {
    const fileName = window.prompt(
      "Enter file name:"
    );

    if (!fileName) return;

    const trimmedName =
      fileName.trim();

    if (!trimmedName) return;

    const newPath =
      `src/${trimmedName}`;

    const alreadyExists =
      files.some(
        (file) =>
          file.path === newPath
      );

    if (alreadyExists) {
      window.alert(
        "A file with this name already exists."
      );
      return;
    }

    const newFile: IDEFile = {
      name: trimmedName,
      path: newPath,
      language:
        getLanguageFromFileName(
          trimmedName
        ),
      content: "",
    };

    setFiles((current) => [
      ...current,
      newFile,
    ]);

    setOpenFiles((current) => [
      ...current,
      newFile.path,
    ]);

    setActiveFilePath(
      newFile.path
    );
  };

  // -----------------------------
  // Delete file
  // -----------------------------

  const handleDeleteFile = (
    file: IDEFile
  ) => {
    const confirmed =
      window.confirm(
        `Delete ${file.name}?`
      );

    if (!confirmed) return;

    const remainingFiles =
      files.filter(
        (item) =>
          item.path !== file.path
      );

    const remainingOpenFiles =
      openFiles.filter(
        (path) =>
          path !== file.path
      );

    setFiles(remainingFiles);
    setOpenFiles(remainingOpenFiles);

    setModifiedFiles((current) =>
      current.filter(
        (path) =>
          path !== file.path
      )
    );

    if (
      file.path === activeFilePath
    ) {
      if (
        remainingOpenFiles.length > 0
      ) {
        setActiveFilePath(
          remainingOpenFiles[0]
        );
      } else if (
        remainingFiles.length > 0
      ) {
        setActiveFilePath(
          remainingFiles[0].path
        );

        setOpenFiles([
          remainingFiles[0].path,
        ]);
      } else {
        setActiveFilePath("");
      }
    }
  };

  // -----------------------------
  // Rename file
  // -----------------------------

  const handleRenameFile = (
    file: IDEFile
  ) => {
    const newName =
      window.prompt(
        "Enter new file name:",
        file.name
      );

    if (!newName) return;

    const trimmedName =
      newName.trim();

    if (
      !trimmedName ||
      trimmedName === file.name
    ) {
      return;
    }

    const newPath =
      file.path.replace(
        file.name,
        trimmedName
      );

    const alreadyExists =
      files.some(
        (item) =>
          item.path === newPath
      );

    if (alreadyExists) {
      window.alert(
        "A file with this name already exists."
      );
      return;
    }

    setFiles((current) =>
      current.map((item) =>
        item.path === file.path
          ? {
              ...item,
              name: trimmedName,
              path: newPath,
              language:
                getLanguageFromFileName(
                  trimmedName
                ),
            }
          : item
      )
    );

    setOpenFiles((current) =>
      current.map((path) =>
        path === file.path
          ? newPath
          : path
      )
    );

    setModifiedFiles((current) =>
      current.map((path) =>
        path === file.path
          ? newPath
          : path
      )
    );

    if (
      activeFilePath === file.path
    ) {
      setActiveFilePath(
        newPath
      );
    }
  };

  // -----------------------------
  // Open file
  // -----------------------------

  const handleFileClick = (
    file: IDEFile
  ) => {
    setActiveFilePath(
      file.path
    );

    if (
      !openFiles.includes(
        file.path
      )
    ) {
      setOpenFiles((current) => [
        ...current,
        file.path,
      ]);
    }
  };

  // -----------------------------
  // Switch tab
  // -----------------------------

  const handleTabClick = (
    path: string
  ) => {
    setActiveFilePath(path);
  };

  // -----------------------------
  // Close tab
  // -----------------------------

  const handleCloseTab = (
    event: React.MouseEvent,
    path: string
  ) => {
    event.stopPropagation();

    const index =
      openFiles.indexOf(path);

    const remainingFiles =
      openFiles.filter(
        (filePath) =>
          filePath !== path
      );

    if (
      path !== activeFilePath
    ) {
      setOpenFiles(
        remainingFiles
      );
      return;
    }

    if (
      remainingFiles.length > 0
    ) {
      const nextFile =
        remainingFiles[
          index - 1
        ] ??
        remainingFiles[index] ??
        remainingFiles[0];

      setOpenFiles(
        remainingFiles
      );

      setActiveFilePath(
        nextFile
      );

      return;
    }

    // Keep one tab open
    if (files.length > 0) {
      setOpenFiles([
        files[0].path,
      ]);

      setActiveFilePath(
        files[0].path
      );
    }
  };

  // -----------------------------
  // Editor changes
  // -----------------------------

  const handleEditorChange = (
    value: string | undefined
  ) => {
    if (
      value === undefined ||
      !activeFile
    ) {
      return;
    }

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.path ===
        activeFile.path
          ? {
              ...file,
              content: value,
            }
          : file
      )
    );

    if (
      !modifiedFiles.includes(
        activeFile.path
      )
    ) {
      setModifiedFiles(
        (current) => [
          ...current,
          activeFile.path,
        ]
      );
    }
  };

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="ide">

      {/* Top Bar */}

      <header className="topbar">

        <div className="logo">
          CloudIDE
        </div>

        <div className="project-name">
          my-project
        </div>

        <div className="topbar-right">
          ● Local
        </div>

      </header>


      {/* Main Area */}

      <div className="main-area">

        {/* File Explorer */}

        <aside className="sidebar">

          <div className="explorer-header">

            <div className="sidebar-title">
              EXPLORER
            </div>

            <button
              className="new-file-button"
              onClick={
                handleCreateFile
              }
              title="New File"
            >
              +
            </button>

          </div>


          {/* src folder */}

          <div className="folder">
            📁 src
          </div>


          {/* Files inside src */}

          {files
            .filter((file) =>
              file.path.startsWith(
                "src/"
              )
            )
            .map((file) => (

              <div
                key={file.path}
                className={`file-row ${
                  activeFilePath ===
                  file.path
                    ? "active-file"
                    : ""
                }`}
              >

                <div
                  className="file nested"
                  onClick={() =>
                    handleFileClick(
                      file
                    )
                  }
                >
                  📄 {file.name}
                </div>

                <div className="file-actions">

                  <button
                    onClick={() =>
                      handleRenameFile(
                        file
                      )
                    }
                    title="Rename"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteFile(
                        file
                      )
                    }
                    title="Delete"
                  >
                    🗑️
                  </button>

                </div>

              </div>

            ))}


          {/* Root files */}

          {files
            .filter(
              (file) =>
                !file.path.startsWith(
                  "src/"
                )
            )
            .map((file) => (

              <div
                key={file.path}
                className={`file-row ${
                  activeFilePath ===
                  file.path
                    ? "active-file"
                    : ""
                }`}
              >

                <div
                  className="file"
                  onClick={() =>
                    handleFileClick(
                      file
                    )
                  }
                >
                  📄 {file.name}
                </div>

                <div className="file-actions">

                  <button
                    onClick={() =>
                      handleRenameFile(
                        file
                      )
                    }
                    title="Rename"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteFile(
                        file
                      )
                    }
                    title="Delete"
                  >
                    🗑️
                  </button>

                </div>

              </div>

            ))}

        </aside>


        {/* Editor */}

        <main className="editor-area">

          {/* Tabs */}

          <div className="tabs">

            {openFiles.map(
              (path) => {

                const file =
                  files.find(
                    (item) =>
                      item.path ===
                      path
                  );

                if (!file) {
                  return null;
                }

                const isActive =
                  file.path ===
                  activeFilePath;

                const isModified =
                  modifiedFiles.includes(
                    file.path
                  );

                return (

                  <div
                    key={file.path}
                    className={`tab ${
                      isActive
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      handleTabClick(
                        file.path
                      )
                    }
                  >

                    <span>
                      {file.name}
                    </span>

                    {isModified && (
                      <span className="modified">
                        ●
                      </span>
                    )}

                    <button
                      className="close-tab"
                      onClick={(
                        event
                      ) =>
                        handleCloseTab(
                          event,
                          file.path
                        )
                      }
                    >
                      ×
                    </button>

                  </div>

                );
              }
            )}

          </div>


          {/* Monaco Editor */}

          <div className="editor-container">

            {activeFile ? (
              <Editor
                height="100%"
                language={
                  activeFile.language
                }
                value={
                  activeFile.content
                }
                theme="vs-dark"
                onChange={
                  handleEditorChange
                }
                options={{
                  minimap: {
                    enabled: true,
                  },

                  fontSize: 14,

                  automaticLayout: true,

                  wordWrap: "on",

                  scrollBeyondLastLine:
                    false,
                }}
              />
            ) : (
              <div
                style={{
                  padding: "30px",
                  color: "#888",
                }}
              >
                No file is open.
              </div>
            )}

          </div>

        </main>

      </div>


      {/* Bottom Panel */}

      <footer className="bottom-panel">

        <span>
          TERMINAL
        </span>

        <span>
          OUTPUT
        </span>

        <span>
          PROBLEMS
        </span>

        <div className="status">
          {activeFile
            ? activeFile.language
            : ""}
        </div>

      </footer>

    </div>
  );
}

export default IDELayout;