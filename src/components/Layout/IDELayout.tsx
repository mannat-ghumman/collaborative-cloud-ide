import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";

import {
  defaultFiles,
  type IDEFile,
} from "../../data/defaultFiles";

import FileSearch from "../FileSearch/FileSearch";

import CommandPalette, {
  type Command,
} from "../CommandPalette/CommandPalette";

import FileIcon from "../FileIcon/FileIcon";
import socket from "../../services/socket";

function getLanguageFromFileName(
  fileName: string
): IDEFile["language"] {
  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  switch (extension) {
    case "tsx":
    case "jsx":
      return "typescriptreact";

    case "ts":
    case "js":
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

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
  ] = useState(false);

  const activeFile = files.find(
    (file) =>
      file.path === activeFilePath
  );

  const workspaceId = "demo-workspace";

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
  // Keyboard Shortcuts
  // -----------------------------

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      // Ctrl + S
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault();
        handleSave();
        return;
      }

      // Ctrl + Shift + P
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Ctrl + P
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Escape
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsCommandPaletteOpen(false);
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

useEffect(() => {
  const handleRemoteChange = (data: {
    filePath: string;
    content: string;
  }) => {
    console.log(
      "REMOTE CHANGE RECEIVED:",
      data.filePath
    );

    setFiles((currentFiles) =>
      currentFiles.map((file) =>
        file.path === data.filePath
          ? {
              ...file,
              content: data.content,
            }
          : file
      )
    );
  };

  socket.on(
    "editor-change",
    handleRemoteChange
  );

  return () => {
    socket.off(
      "editor-change",
      handleRemoteChange
    );
  };
}, []);

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
    setOpenFiles(
      remainingOpenFiles
    );

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

  // Update local file state
  setFiles((currentFiles) =>
    currentFiles.map((file) =>
      file.path === activeFile.path
        ? {
            ...file,
            content: value,
          }
        : file
    )
  );

  // Mark file as modified
  if (
    !modifiedFiles.includes(
      activeFile.path
    )
  ) {
    setModifiedFiles((current) => [
      ...current,
      activeFile.path,
    ]);
  }

  // Send the change to other users
  socket.emit("editor-change", {
    workspaceId,
    filePath: activeFile.path,
    content: value,
  });
};

  // -----------------------------
  // File Search
  // -----------------------------

  const handleSearchSelect = (
    file: IDEFile
  ) => {
    handleFileClick(file);
    setIsSearchOpen(false);
  };

  // -----------------------------
  // Command Palette
  // -----------------------------

  const commands: Command[] = [
    {
      id: "new-file",
      label: "New File",
      shortcut: "Ctrl + N",
    },
    {
      id: "save-file",
      label: "Save File",
      shortcut: "Ctrl + S",
    },
    {
      id: "rename-file",
      label: "Rename File",
    },
    {
      id: "delete-file",
      label: "Delete File",
    },
    {
      id: "close-tab",
      label: "Close Active Tab",
    },
    {
      id: "file-search",
      label: "File Search",
      shortcut: "Ctrl + P",
    },
  ];

  const handleCommandExecute = (
    command: Command
  ) => {
    setIsCommandPaletteOpen(false);

    switch (command.id) {
      case "new-file":
        handleCreateFile();
        break;

      case "save-file":
        handleSave();
        break;

      case "rename-file":
        if (activeFile) {
          handleRenameFile(
            activeFile
          );
        }
        break;

      case "delete-file":
        if (activeFile) {
          handleDeleteFile(
            activeFile
          );
        }
        break;

      case "close-tab":
        if (activeFile) {
          const event = {
            stopPropagation: () => {},
          } as React.MouseEvent;

          handleCloseTab(
            event,
            activeFile.path
          );
        }
        break;

      case "file-search":
        setIsSearchOpen(true);
        break;

      default:
        break;
    }
  };

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="ide">

      {/* File Search */}

      {isSearchOpen && (
        <FileSearch
          files={files}
          onSelect={
            handleSearchSelect
          }
          onClose={() =>
            setIsSearchOpen(false)
          }
        />
      )}

      {/* Command Palette */}

      {isCommandPaletteOpen && (
        <CommandPalette
          commands={commands}
          onExecute={
            handleCommandExecute
          }
          onClose={() =>
            setIsCommandPaletteOpen(
              false
            )
          }
        />
      )}

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
                  <FileIcon fileName={file.name} />{" "}
{file.name}
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
                  <FileIcon fileName={file.name} />
  {file.name}
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

                    <span className="tab-name">
  <FileIcon fileName={file.name} />
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