import {
  SiReact,
  SiTypescript,
  SiJavascript,
  SiJson,
  SiMarkdown,
} from "react-icons/si";

interface FileIconProps {
  fileName: string;
}

function FileIcon({ fileName }: FileIconProps) {
  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  switch (extension) {
    case "tsx":
    case "jsx":
      return (
        <SiReact
          size={16}
          color="#61DAFB"
        />
      );

    case "ts":
      return (
        <SiTypescript
          size={16}
          color="#3178C6"
        />
      );

    case "js":
      return (
        <SiJavascript
          size={16}
          color="#F7DF1E"
        />
      );

    case "json":
      return (
        <SiJson
          size={16}
          color="#F5A623"
        />
      );

    case "md":
      return (
        <SiMarkdown
          size={16}
          color="#519ABA"
        />
      );

    default:
      return (
        <span
          style={{
            fontSize: "14px",
            color: "#888",
          }}
        >
          📄
        </span>
      );
  }
}

export default FileIcon;