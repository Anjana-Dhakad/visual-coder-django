# Visual Coder 🚀

Welcome to Visual Coder, a web-based tool designed to bridge the gap between visual logic and programming. This application allows you to seamlessly convert C code into interactive flowcharts and, conversely, design flowcharts to generate corresponding C code.

It's built with React and the powerful `react-flow` library to provide a smooth, drag-and-drop experience.

![Visual Coder Home Page](https://user-images.githubusercontent.com/assets/placeholder.png) <!-- You can add a screenshot link later -->

---

## ✨ Features

This project is divided into two main utilities:

### 1. **Code to Flowchart**
- **Automatic Generation:** Write or paste your C code into the editor.
- **Smart Parsing:** The tool intelligently ignores comments, includes, and `main()` braces to only visualize the core logic.
- **Visual Logic:** Understand the flow of complex `if-else` conditions at a glance.
- **Interactive Canvas:** The generated flowchart is fully interactive, powered by `react-flow`.

### 2. **Flowchart to Code**
- **Drag & Drop Interface:** Easily build flowcharts by dragging nodes from the sidebar onto the canvas.
- **Custom Nodes:** Includes specific nodes for Start/End, Input/Output, and Decisions.
- **Editable Nodes:** Double-click on any node to edit its content or logic.
- **Intelligent Edge Labeling:** Automatically prompts for 'true' or 'false' paths when connecting from a decision node.
- **Syntax-Aware Code Generation:** Generates valid C code from your flowchart, automatically handling `printf` syntax and semicolons.

---

## 🛠️ Tech Stack

- **Frontend:** [React.js](https://reactjs.org/)
- **Flowchart & Canvas:** [React Flow](https://reactflow.dev/)
- **Routing:** [React Router](https://reactrouter.com/)
- **Styling:** Custom CSS with a modern dark theme.

---

## ⚙️ Getting Started

To run this project locally on your machine, follow these simple steps.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v14 or later)
- `npm` or `yarn` package manager

### Installation & Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/Anjana-Dhakad/visual-coder.git 
   # Replace with your repository URL
   ```

2. **Navigate to the project directory:**
   ```sh
   cd visual-coder
   ```

3. **Install dependencies:**
   ```sh
   npm install
   ```

4. **Run the development server:**
   ```sh
   npm start
   ```

The application will now be running at `http://localhost:3000`.

---