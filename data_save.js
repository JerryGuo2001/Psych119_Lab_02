const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
const numNodes = 5;
const nodeRadius=20;
let adjacencyMatrix = [];
const bucketURL = "https://demoforschemas.s3.us-east-2.amazonaws.com/graphs/";

// Node positions arranged in a circular layout
const nodePositions = Array.from({ length: numNodes }, (_, i) => {
    const angle = (i / numNodes) * Math.PI * 2;
    return {
        x: canvas.width / 2 + Math.cos(angle) * 180,
        y: canvas.height / 2 + Math.sin(angle) * 180
    };
});

// Fetch and parse the latest CSV graph from S3
async function loadGraphFromS3() {
    try {
        const response = await fetch(`${bucketURL}latest_graph.csv`);
        if (!response.ok) throw new Error("Failed to load CSV");

        const csvText = await response.text();
        adjacencyMatrix = csvToMatrix(csvText);
        drawGraph();
    } catch (error) {
        console.error("Error loading graph:", error);
        generateSparseGraph();
        drawGraph();
    }
}

// Convert CSV text to adjacency matrix
function csvToMatrix(csvText) {
    return csvText.trim().split("\n").map(row => row.split(",").map(Number));
}

// Function to generate a sparse graph (used only if loading fails)
function generateSparseGraph() {
    adjacencyMatrix = Array.from({ length: numNodes }, () => Array(numNodes).fill(0));

    let connectedNodes = new Set([0]);
    let remainingNodes = new Set([...Array(numNodes).keys()].slice(1));

    while (remainingNodes.size > 0) {
        let fromNode = [...connectedNodes][Math.floor(Math.random() * connectedNodes.size)];
        let toNode = [...remainingNodes][Math.floor(Math.random() * remainingNodes.size)];

        if (getConnectionCount(fromNode) < 2 && getConnectionCount(toNode) < 2) {
            adjacencyMatrix[fromNode][toNode] = 1;
            adjacencyMatrix[toNode][fromNode] = 1;

            connectedNodes.add(toNode);
            remainingNodes.delete(toNode);
        }
    }
}

// Count number of connections for a node
function getConnectionCount(node) {
    return adjacencyMatrix[node].reduce((sum, val) => sum + val, 0);
}

// Draw the graph from the adjacency matrix
function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    // Draw edges
    adjacencyMatrix.forEach((row, i) => {
        row.forEach((connected, j) => {
            if (connected) {
                ctx.beginPath();
                ctx.moveTo(nodePositions[i].x, nodePositions[i].y);
                ctx.lineTo(nodePositions[j].x, nodePositions[j].y);
                ctx.stroke();
            }
        });
    });

    // Draw nodes
    nodePositions.forEach((pos, i) => {
        ctx.fillStyle = "blue";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i, pos.x, pos.y);
    });
}

// Function to submit the graph to S3
async function submitGraph() {
    const csvContent = adjacencyMatrix.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", blob, "latest_graph.csv");

    try {
        const response = await fetch("https://srn-wpprioi42-jerryguo2001s-projects.vercel.app/upload-csv", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

        const data = await response.json();
        console.log("Graph saved at:", data.fileUrl);
    } catch (error) {
        console.error("Error uploading CSV:", error);
    }
}
