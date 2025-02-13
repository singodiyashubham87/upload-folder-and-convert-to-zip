import { createElement, useRef, useState } from "react";
import "./App.css";
import JSZip from "jszip";

// Define a list of files/folders to ignore
const ignoreList = [
  // Folders
  "node_modules",
  "dist",
  ".git",
  // Files
  "package-lock.json",
];

const allowedExtensions = [
  ".html",
  ".css",
  ".js",
  ".md",
  ".jsx",
  ".cjs",
  ".babelrc",
  ".gitignore",
  ".json",
];

function App() {
  const tableRef = useRef();
  const tableBodyRef = useRef();
  const [isJsonAvailable, setIsJsonAvailable] = useState(false);
  const [questionContentJson, setQuestionContentJson] = useState({})
  const [zipBuffer, setZipBuffer] = useState(null);

  let fileContentMap = {};

  const _filterFilesToBeIgnored = (files) => {
    return files.filter((file) => {
      const isIgnored = ignoreList.some((ignoreItem) => {
        return (
          file.webkitRelativePath.includes(ignoreItem) || // Ignore folders/files in the path
          file.name === ignoreItem // Ignore specific file names
        );
      });

      const hasAllowedExtension = allowedExtensions.some((ext) =>
        file.name.endsWith(ext)
      );

      return !isIgnored && hasAllowedExtension;
    });
  };

  const _readFileContent = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target.result;
      console.log(`Content of ${file.name}:\n`, fileContent);
      alert(fileContent);
    };

    reader.onerror = (error) => {
      console.error(`Error reading file ${file.name}:`, error);
    };

    reader.readAsText(file);
  };

  const _populateTable = (filteredFiles) => {
    const tableBody = tableBodyRef.current;

    filteredFiles.forEach((file, index) => {
      const row = document.createElement("tr");

      const cells = [
        index + 1,
        file.name,
        file.webkitRelativePath,
        file.size,
        file.type,
      ];

      cells.forEach((cellData) => {
        const cell = document.createElement("td");
        cell.textContent = cellData;
        row.appendChild(cell);
      });

      // Add a button to view the file content
      const viewButtonCell = document.createElement("td");
      const viewButton = document.createElement("button");
      viewButton.textContent = "View Content";
      viewButton.addEventListener("click", () => _readFileContent(file));

      viewButtonCell.appendChild(viewButton);
      row.appendChild(viewButtonCell);

      tableBody.appendChild(row);
    });
  };

  const _convertFilesToJson = async (files) => {
    await Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = (e) => {
            const fileContent = e.target.result;
            const relativePath = file.webkitRelativePath
              .split("/")
              .slice(1)
              .join("/"); // Remove root folder
            fileContentMap[relativePath] = fileContent; // Store in JSON object
            resolve();
          };

          reader.onerror = (error) => {
            console.error(`Error reading file ${file.name}:`, error);
            reject(error);
          };

          reader.readAsText(file);
        });
      })
    );

    return fileContentMap;
  };

  async function _transformToZip(questionContent) {
    try {
      const zip = new JSZip();

      for (const [filePath, content] of Object.entries(questionContent)) {
        zip.file(filePath, content);
      }

      return await zip.generateAsync({ type: "blob" });
    } catch (error) {
      console.error("Error generating zip file: ", error.message ?? error);
      throw error;
    }
  }

  const handleFolderUpload = async (e) => {
    const table = tableRef.current;
    const tableBody = tableBodyRef.current;
    tableBody.innerHTML = "";

    const files = Array.from(e.target.files);
    const filteredFiles = _filterFilesToBeIgnored(files);

    // Populate the table with the filtered files
    _populateTable(filteredFiles);

    const questionJson = await _convertFilesToJson(filteredFiles);
    setQuestionContentJson(questionJson)

    const zip = await _transformToZip(questionJson);
    setZipBuffer(zip)

    setIsJsonAvailable(true);

    // Show the table after populating
    table.style.display = filteredFiles.length > 0 ? "table" : "none";
  };

  const handleJsonDownload = () => {
    const jsonString = JSON.stringify(questionContentJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "stackblitz-project.json";
    link.click();

    URL.revokeObjectURL(link.href);
  };

  const handleZipDownload = () => {
    const blob = new Blob([zipBuffer], { type: "application/zip" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "stackblitz-project.zip";
    link.click();

    URL.revokeObjectURL(link.href);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <p
        style={{
          display: "flex",
          gap: "1rem",
        }}
      >
        <span>Select The Directory:</span>
        <input
          id="folderInput"
          type="file"
          webkitdirectory="true"
          mozdirectory="true"
          onChange={(e) => handleFolderUpload(e)}
        />
      </p>
      <p>
        You can select any directory with multiple files or multiple child
        directories in it.
      </p>
      {isJsonAvailable && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <button onClick={handleJsonDownload}>Download as JSON</button>
          <button onClick={handleZipDownload}>Download as Zip</button>
        </div>
      )}
      <table
        id="fileTable"
        style={{
          display: "none",
        }}
        ref={tableRef}
      >
        <thead>
          <tr>
            <th>#</th>
            <th>File Name</th>
            <th>Relative Path</th>
            <th>Size (bytes)</th>
            <th>Type</th>
            <th>View Content</th>
          </tr>
        </thead>
        <tbody ref={tableBodyRef}></tbody>
      </table>
      <pre id="jsonOutput"></pre>
    </div>
  );
}

export default App;
