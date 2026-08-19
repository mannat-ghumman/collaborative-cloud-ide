import { useEffect, useState } from "react";
import type { IDEFile } from "../../data/defaultFiles";
import "./FileSearch.css";

interface FileSearchProps {
  files: IDEFile[];
  onSelect: (file: IDEFile) => void;
  onClose: () => void;
}

function FileSearch({
  files,
  onSelect,
  onClose,
}: FileSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredFiles = files.filter(
    (file) =>
      file.name
        .toLowerCase()
        .includes(query.toLowerCase()) ||
      file.path
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        setSelectedIndex((current) =>
          Math.min(
            current + 1,
            Math.max(filteredFiles.length - 1, 0)
          )
        );

        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        setSelectedIndex((current) =>
          Math.max(current - 1, 0)
        );

        return;
      }

      if (
        event.key === "Enter" &&
        filteredFiles.length > 0
      ) {
        event.preventDefault();

        onSelect(filteredFiles[selectedIndex]);
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
  }, [
    filteredFiles,
    selectedIndex,
    onClose,
    onSelect,
  ]);

  return (
    <div
      className="file-search-overlay"
      onMouseDown={onClose}
    >
      <div
        className="file-search"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <input
          autoFocus
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search files..."
        />

        <div className="file-search-results">
          {filteredFiles.map((file, index) => (
            <div
              key={file.path}
              className={`file-search-result ${
                index === selectedIndex
                  ? "selected"
                  : ""
              }`}
              onMouseEnter={() =>
                setSelectedIndex(index)
              }
              onClick={() =>
                onSelect(file)
              }
            >
              <div>
                📄 {file.name}
              </div>

              <span>
                {file.path}
              </span>
            </div>
          ))}

          {filteredFiles.length === 0 && (
            <div className="no-results">
              No files found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileSearch;