import { useEffect, useState } from "react";
import "./CommandPalette.css";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  onExecute: (command: Command) => void;
  onClose: () => void;
}

function CommandPalette({
  commands,
  onExecute,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter((command) =>
    command.label
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
            Math.max(filteredCommands.length - 1, 0)
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
        filteredCommands.length > 0
      ) {
        event.preventDefault();

        onExecute(filteredCommands[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    filteredCommands,
    selectedIndex,
    onClose,
    onExecute,
  ]);

  return (
    <div
      className="command-palette-overlay"
      onMouseDown={onClose}
    >
      <div
        className="command-palette"
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
          placeholder="Type a command..."
        />

        <div className="command-palette-results">
          {filteredCommands.map(
            (command, index) => (
              <div
                key={command.id}
                className={`command-palette-item ${
                  index === selectedIndex
                    ? "selected"
                    : ""
                }`}
                onMouseEnter={() =>
                  setSelectedIndex(index)
                }
                onClick={() =>
                  onExecute(command)
                }
              >
                <span className="command-label">
                  {command.label}
                </span>

                {command.shortcut && (
                  <span className="command-shortcut">
                    {command.shortcut}
                  </span>
                )}
              </div>
            )
          )}

          {filteredCommands.length === 0 && (
            <div className="command-no-results">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;