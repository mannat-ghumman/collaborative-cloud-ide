import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

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
import { getWorkspace } from "../../services/workspaceApi";

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

interface IDELayoutProps {
  workspaceId: string;
}

function IDELayout({
  workspaceId,
}: IDELayoutProps) {
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

  const [onlineUsers, setOnlineUsers] =
  useState<string[]>([]);

const saveTimeoutRef =
  useRef<ReturnType<typeof setTimeout> | null>(null);

const editorRef =
  useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

const monacoRef =
  useRef<typeof Monaco | null>(null);

const remoteDecorationsRef =
  useRef<string[]>([]);

const activeFilePathRef =
  useRef(activeFilePath);

useEffect(() => {
  activeFilePathRef.current =
    activeFilePath;
}, [activeFilePath]);

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
  // -----------------------------------------
  // Remote Editor Change
  // -----------------------------------------

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

  // -----------------------------------------
  // Remote Cursor
  // -----------------------------------------

  const handleRemoteCursor = (data: {
    socketId: string;
    filePath: string;
    position: {
      lineNumber: number;
      column: number;
    };
  }) => {
    if (
      !editorRef.current ||
      !monacoRef.current
    ) {
      return;
    }

    if (
      data.filePath !==
      activeFilePathRef.current
    ) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const decoration =
      editor.deltaDecorations(
        remoteDecorationsRef.current,
        [
          {
            range: new monaco.Range(
              data.position.lineNumber,
              data.position.column,
              data.position.lineNumber,
              data.position.column
            ),

            options: {
              className:
                "remote-cursor",

              hoverMessage: {
                value: `Collaborator ${data.socketId.slice(
                  0,
                  6
                )}`,
              },
            },
          },
        ]
      );

    remoteDecorationsRef.current =
      decoration;
  };

  // -----------------------------------------
  // Remote File Created
  // -----------------------------------------

  const handleRemoteFileCreated = (data: {
    file: IDEFile;
  }) => {
    const file = data.file;

    setFiles((current) => {
      const alreadyExists =
        current.some(
          (item) =>
            item.path === file.path
        );

      if (alreadyExists) {
        return current;
      }

      return [...current, file];
    });

    console.log(
      "REMOTE FILE CREATED:",
      file.path
    );
  };

  // -----------------------------------------
  // Remote File Renamed
  // -----------------------------------------

  const handleRemoteFileRenamed = (data: {
    oldPath: string;
    file: IDEFile;
  }) => {
    setFiles((current) =>
      current.map((file) =>
        file.path === data.oldPath
          ? data.file
          : file
      )
    );

    setOpenFiles((current) =>
      current.map((path) =>
        path === data.oldPath
          ? data.file.path
          : path
      )
    );

    setModifiedFiles((current) =>
      current.map((path) =>
        path === data.oldPath
          ? data.file.path
          : path
      )
    );

    if (
      activeFilePathRef.current ===
      data.oldPath
    ) {
      setActiveFilePath(
        data.file.path
      );
    }

    console.log(
      "REMOTE FILE RENAMED:",
      data.oldPath,
      "→",
      data.file.path
    );
  };

  // -----------------------------------------
  // Remote File Deleted
  // -----------------------------------------

  const handleRemoteFileDeleted = (data: {
    filePath: string;
  }) => {
    const filePath = data.filePath;

    setFiles((current) =>
      current.filter(
        (file) =>
          file.path !== filePath
      )
    );

    setOpenFiles((current) =>
      current.filter(
        (path) => path !== filePath
      )
    );

    setModifiedFiles((current) =>
      current.filter(
        (path) => path !== filePath
      )
    );

    if (
      activeFilePathRef.current ===
      filePath
    ) {
      setActiveFilePath("");
    }

    console.log(
      "REMOTE FILE DELETED:",
      filePath
    );
  };

  // -----------------------------------------
  // Workspace Users
  // -----------------------------------------

  const handleWorkspaceUsers = (data: {
    users: string[];
  }) => {
    console.log(
      "WORKSPACE USERS:",
      data.users
    );

    setOnlineUsers(data.users);
  };

  // -----------------------------------------
  // User Joined
  // -----------------------------------------

  const handleUserJoined = (data: {
    socketId: string;
  }) => {
    console.log(
      "USER JOINED WORKSPACE:",
      data.socketId
    );

    setOnlineUsers((current) => {
      if (
        current.includes(data.socketId)
      ) {
        return current;
      }

      return [
        ...current,
        data.socketId,
      ];
    });
  };

  // -----------------------------------------
  // User Left
  // -----------------------------------------

  const handleUserLeft = (data: {
    socketId: string;
  }) => {
    console.log(
      "USER LEFT WORKSPACE:",
      data.socketId
    );

    setOnlineUsers((current) =>
      current.filter(
        (id) =>
          id !== data.socketId
      )
    );
  };

  // -----------------------------------------
  // Register listeners
  // -----------------------------------------

  socket.on(
    "editor-change",
    handleRemoteChange
  );

  socket.on(
    "cursor-move",
    handleRemoteCursor
  );

  socket.on(
    "file-created",
    handleRemoteFileCreated
  );

  socket.on(
    "file-renamed",
    handleRemoteFileRenamed
  );

  socket.on(
    "file-deleted",
    handleRemoteFileDeleted
  );

  socket.on(
    "workspace-users",
    handleWorkspaceUsers
  );

  socket.on(
    "user-joined",
    handleUserJoined
  );

  socket.on(
    "user-left",
    handleUserLeft
  );

  // -----------------------------------------
  // Connect + Join Workspace
  // -----------------------------------------

  const joinWorkspace = () => {
    console.log(
      "SOCKET CONNECTED:",
      socket.id
    );

    console.log(
      "JOINING WORKSPACE:",
      workspaceId
    );

    socket.emit(
      "join-workspace",
      workspaceId
    );
  };

  if (socket.connected) {
    joinWorkspace();
  } else {
    socket.once(
      "connect",
      joinWorkspace
    );
  }

  // -----------------------------------------
  // Cleanup
  // -----------------------------------------

  return () => {
    socket.off(
      "editor-change",
      handleRemoteChange
    );

    socket.off(
      "cursor-move",
      handleRemoteCursor
    );

    socket.off(
      "file-created",
      handleRemoteFileCreated
    );

    socket.off(
      "file-renamed",
      handleRemoteFileRenamed
    );

    socket.off(
      "file-deleted",
      handleRemoteFileDeleted
    );

    socket.off(
      "workspace-users",
      handleWorkspaceUsers
    );

    socket.off(
      "user-joined",
      handleUserJoined
    );

    socket.off(
      "user-left",
      handleUserLeft
    );

    socket.off(
      "connect",
      joinWorkspace
    );
  };
}, [workspaceId]);





useEffect(() => {
  async function loadWorkspace() {
    try {
      const data =
        await getWorkspace(
          workspaceId
        );

      if (data.files.length > 0) {
        setFiles(data.files);
      }

      console.log(
        "Workspace loaded:",
        data.workspace.name
      );

      console.log(
        "Files loaded:",
        data.files
      );
    } catch (error) {
      console.error(
        "Failed to load workspace:",
        error
      );
    }
  }

  loadWorkspace();
}, [workspaceId]);

  // -----------------------------
  // Create file
  // -----------------------------

 const handleCreateFile = async () => {
  const fileName = window.prompt(
    "Enter file name:"
  );

  if (!fileName) return;

  const trimmedName = fileName.trim();

  if (!trimmedName) return;

  const newPath = `src/${trimmedName}`;

  const alreadyExists = files.some(
    (file) => file.path === newPath
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
      getLanguageFromFileName(trimmedName),
    content: "",
  };

  try {
    // Create file in PostgreSQL
    const response = await fetch(
      `http://localhost:3001/api/workspaces/${workspaceId}/files`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFile.name,
          path: newFile.path,
          language: newFile.language,
          content: newFile.content,
        }),
      }
    );

    if (!response.ok) {
  throw new Error(
    `Failed to create file: ${response.status}`
  );
}

const data = await response.json();

const createdFile: IDEFile = {
  name: data.file.name,
  path: data.file.path,
  language: data.file.language,
  content: data.file.content,
};

socket.emit("file-created", {
  workspaceId,
  file: createdFile,
});

    // Add to frontend only after database succeeds
    setFiles((current) => [
      ...current,
      createdFile,
    ]);

    setOpenFiles((current) => [
      ...current,
      createdFile.path,
    ]);

    setActiveFilePath(
      createdFile.path
    );

    console.log(
      "File created:",
      newFile.path
    );
  } catch (error) {
    console.error(
      "Failed to create file:",
      error
    );

    window.alert(
      "Failed to create file."
    );
  }
};

  // -----------------------------
  // Delete file
  // -----------------------------

  const handleDeleteFile = async (
  file: IDEFile
) => {
  const confirmed =
    window.confirm(
      `Delete ${file.name}?`
    );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `http://localhost:3001/api/workspaces/${workspaceId}/files`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath: file.path,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to delete file: ${response.status}`
      );
    }

    socket.emit("file-deleted", {
  workspaceId,
  filePath: file.path,
});

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

    // If the deleted file was active,
    // select another open file.
    if (
      activeFilePath === file.path
    ) {
      if (
        remainingOpenFiles.length > 0
      ) {
        setActiveFilePath(
          remainingOpenFiles[
            remainingOpenFiles.length - 1
          ]
        );
      } else {
        setActiveFilePath("");
      }
    }

    console.log(
      "File deleted:",
      file.path
    );
  } catch (error) {
    console.error(
      "Failed to delete file:",
      error
    );

    window.alert(
      "Failed to delete file."
    );
  }
};

  // -----------------------------
  // Rename file
  // -----------------------------

  const handleRenameFile = async (
  file: IDEFile
) => {
  const newName = window.prompt(
    "Enter new file name:",
    file.name
  );

  if (!newName) return;

  const trimmedName = newName.trim();

  if (
    !trimmedName ||
    trimmedName === file.name
  ) {
    return;
  }

  const newPath = file.path.replace(
    file.name,
    trimmedName
  );

  const alreadyExists = files.some(
    (item) =>
      item.path === newPath
  );

  if (alreadyExists) {
    window.alert(
      "A file with this name already exists."
    );
    return;
  }

  const newLanguage =
    getLanguageFromFileName(
      trimmedName
    );

  try {
    // Update PostgreSQL
    const response = await fetch(
      `http://localhost:3001/api/workspaces/${workspaceId}/files/rename`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPath: file.path,
          newName: trimmedName,
          newPath,
          language: newLanguage,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to rename file: ${response.status}`
      );
    }

    const data = await response.json();

    const renamedFile: IDEFile = {
      name: data.file.name,
      path: data.file.path,
      language: data.file.language,
      content: data.file.content,
    };

    // Update local state
    setFiles((current) =>
      current.map((item) =>
        item.path === file.path
          ? renamedFile
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
      setActiveFilePath(newPath);
    }

    // Tell other tabs
    socket.emit("file-renamed", {
      workspaceId,
      oldPath: file.path,
      file: renamedFile,
    });

    console.log(
      "File renamed:",
      newPath
    );
  } catch (error) {
    console.error(
      "Failed to rename file:",
      error
    );

    window.alert(
      "Failed to rename file."
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


  const handleEditorMount: OnMount = (
  editor,
  monaco
) => {
  editorRef.current = editor;
  monacoRef.current = monaco;

  editor.onDidChangeCursorPosition(
    (event) => {
      const currentPath =
        activeFilePathRef.current;

      if (!currentPath) {
        return;
      }

      socket.emit(
        "cursor-move",
        {
          workspaceId,
          filePath: currentPath,
          position: {
            lineNumber:
              event.position.lineNumber,
            column:
              event.position.column,
          },
        }
      );
    }
  );
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

  // Update local state immediately
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

  // Send change immediately to other tabs
  socket.emit("editor-change", {
    workspaceId,
    filePath: activeFile.path,
    content: value,
  });

  

  // Cancel previous database save
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  // Save to PostgreSQL after 500ms of no typing
  saveTimeoutRef.current = setTimeout(
    async () => {
      try {
        const response = await fetch(
          `http://localhost:3001/api/workspaces/${workspaceId}/files`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              filePath: activeFile.path,
              content: value,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to save file: ${response.status}`
          );
        }

        console.log(
          "File saved to PostgreSQL:",
          activeFile.path
        );
      } catch (error) {
        console.error(
          "Failed to save file to PostgreSQL:",
          error
        );
      }
    },
    500
  );
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

            <div
  style={{
    fontSize: "12px",
    color: "#888",
    marginTop: "4px",
  }}
>
  {onlineUsers.length}{" "}
  {onlineUsers.length === 1
    ? "collaborator"
    : "collaborators"}{" "}
  online
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
                onMount={handleEditorMount}
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