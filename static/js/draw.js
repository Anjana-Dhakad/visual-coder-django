document.addEventListener('DOMContentLoaded', () => {
    const id = document.getElementById("drawflow");
    
    // --- START OF FIX ---
    // Initialize Drawflow without Vue and set reroute option correctly
    const editor = new Drawflow(id);
    editor.reroute = true; // This fixes the connection lines
    // --- END OF FIX ---
    
    editor.start();

    console.log("Drawflow editor started with rerouting!");

    // --- Drag and Drop Logic ---
    window.drag = (ev) => {
        ev.dataTransfer.setData("node", ev.target.getAttribute('data-node'));
    };

    window.drop = (ev) => {
        ev.preventDefault();
        const nodeName = ev.dataTransfer.getData("node");
        addNodeToDrawflow(nodeName, ev.clientX, ev.clientY);
    };

    window.allowDrop = (ev) => {
        ev.preventDefault();
    };

    id.addEventListener("dragover", allowDrop);
    id.addEventListener("drop", drop);

    function addNodeToDrawflow(name, pos_x, pos_y) {
        pos_x -= editor.precanvas.offsetLeft;
        pos_y -= editor.precanvas.offsetTop;

        switch (name) {
            case 'start':
                var startNode = `
                <div>
                  <div class="title-box">Start</div>
                </div>`;
                editor.addNode('start', 0, 1, pos_x, pos_y, 'start', {}, startNode);
                break;
            
            case 'io':
                var ioNode = `
                <div>
                  <div class="title-box">Input/Output</div>
                  <div class="box">
                    <input type="text" df-text placeholder="e.g., printf(&quot;Hi&quot;)">
                  </div>
                </div>`;
                editor.addNode('io', 1, 1, pos_x, pos_y, 'io', { text: '' }, ioNode);
                break;
            
            case 'decision':
                var decisionNode = `
                <div>
                  <div class="title-box">
                     <input type="text" df-condition placeholder="Condition" style="width:80%; text-align:center;">
                  </div>
                </div>`;
                editor.addNode('decision', 1, 2, pos_x, pos_y, 'decision', { condition: '' }, decisionNode);
                break;
            
            default:
        }
    }
    
    // Clear canvas button
    document.getElementById('clear-btn').addEventListener('click', () => {
        editor.clear();
    });

    // Generate Code Button
    document.getElementById('generate-code-btn').addEventListener('click', () => {
        const flowchartData = editor.export();
        console.log("Exported Flowchart Data:", flowchartData);
        alert("Code generation is not implemented yet. Check the console for the flowchart data.");
    });
});