// Wait for the page to fully load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Flowchart page JS loaded and ready!");

    // Step 1: Get all the necessary HTML elements
    const generateBtn = document.getElementById('generate-btn');
    const codeInput = document.getElementById('code-input');
    const flowchartOutputDiv = document.getElementById('flowchart-output');

    // Function to get CSRF token required by Django for POST requests
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');

    /**
     * Step 3: Convert the JSON data from our Django API into Mermaid.js syntax.
     * Example: 
     *  - Node: node-1[Start]
     *  - Edge: node-1 --> node-2
     */
    
        /**
     * Step 3: Convert the JSON data from our Django API into Mermaid.js syntax.
     * This version is improved to handle special characters correctly.
     */
    function convertApiDataToMermaid(data) {
        let mermaidString = 'graph TD;\n'; // TD = Top-Down graph

        // Process all nodes
        data.nodes.forEach(node => {
            const id = node.id;
            
            // --- START OF FIX ---
            // Sanitize label text for Mermaid syntax.
            // 1. Replace all backslashes with double backslashes
            // 2. Replace all double quotes with the HTML entity &quot;
            // 3. Replace semicolons to avoid breaking syntax
            let label = node.data.label
                            .replace(/\\/g, '\\\\')
                            .replace(/"/g, '&quot;')
                            .replace(/;/g, ' '); // Replace semicolon with a space
            // --- END OF FIX ---

            // Use different shapes for different node types
            switch (node.type) {
                case 'startEnd':
                    mermaidString += `    ${id}(["${label}"]);\n`; // Stadium shape
                    break;
                case 'decision':
                    mermaidString += `    ${id}{"${label}"};\n`; // Rhombus shape
                    break;
                case 'inputOutput':
                default:
                    // If a label is empty, give it a space to prevent mermaid error
                    if (label.trim() === '') {
                        label = ' ';
                    }
                    mermaidString += `    ${id}["${label}"];\n`; // Rectangle shape
                    break;
            }
        });

        // Process all edges (this part was already correct)
        data.edges.forEach(edge => {
            if (edge.label) {
                mermaidString += `    ${edge.source} -->|${edge.label}| ${edge.target};\n`;
            } else {
                mermaidString += `    ${edge.source} --> ${edge.target};\n`;
            }
        });

        console.log("Generated Mermaid Syntax:\n", mermaidString); // For debugging
        return mermaidString;
    }

    // Step 2: Add a click event listener to the "Generate Flowchart" button
    generateBtn.addEventListener('click', async () => {
        const code = codeInput.value;

        if (!code.trim()) {
            alert("Please enter some C code.");
            return;
        }

        // Show a loading message and clear old flowchart
        flowchartOutputDiv.innerHTML = '<p class="placeholder-text">Generating flowchart...</p>';

        try {
            // Make the API call to our Django backend
            const response = await fetch('/api/generate-flowchart/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken, // Don't forget the CSRF token!
                },
                body: JSON.stringify({ code: code }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Something went wrong on the server.');
            }

            const data = await response.json();

            if (data.status === 'success') {
                // Convert API response to Mermaid syntax
                const mermaidSyntax = convertApiDataToMermaid(data);
                
                // Create a <pre> element for Mermaid.js to render
                const pre = document.createElement('pre');
                pre.className = 'mermaid';
                pre.textContent = mermaidSyntax;

                // Clear the output div and add the new pre element
                flowchartOutputDiv.innerHTML = '';
                flowchartOutputDiv.appendChild(pre);

                // Tell Mermaid.js to render the new flowchart
                await mermaid.run({
                    nodes: [pre]
                });

            } else {
                throw new Error(data.message);
            }

        } catch (error) {
            console.error('Error:', error);
            flowchartOutputDiv.innerHTML = `<p class="placeholder-text" style="color: red;">Error: ${error.message}</p>`;
        }
    });
});