// editor/editor.js
document.addEventListener('DOMContentLoaded', () => {
    const mathFieldSpan = document.getElementById('math-field');
    const insertButton = document.getElementById('insert-button');
    const cancelButton = document.getElementById('cancel-button'); // Math cancel
    
    const tabNavigation = document.getElementById('tab-navigation');
    const toolbarTabsContainer = document.getElementById('toolbar-tabs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const toolbarTabs = document.querySelectorAll('.toolbar-tab');

    const editorWindow = document.getElementById('editor-window');
    
    const MQ = MathQuill.getInterface(2);
    const mathField = MQ.MathField(mathFieldSpan, {
        spaceBehavesLikeTab: false, // **** KEY CHANGE HERE ****
        handlers: { 
            edit: function() { /* Called after content changes */ }
            // No need for enter handler for this specific spacebar issue
        }
    });

    // --- Spacebar Handler REMOVED ---
    // With spaceBehavesLikeTab: false, MathQuill should handle space insertion by default.
    // The custom keydown listener added previously is no longer needed.

    // Tab Switching Logic
    tabNavigation.addEventListener('click', (event) => {
        const targetButton = event.target.closest('.tab-button');
        if (!targetButton) return;
        const tabIdToShow = targetButton.dataset.tab;
        tabButtons.forEach(button => button.classList.remove('active'));
        toolbarTabs.forEach(tab => tab.classList.remove('active'));
        targetButton.classList.add('active');
        document.getElementById(`tab-${tabIdToShow}`).classList.add('active');
        mathField.focus();
    });

    // Toolbar button click handler
    toolbarTabsContainer.addEventListener('click', (event) => {
        const target = event.target.closest('button');
        if (!target || !target.matches('.toolbar-tab button')) return;
        const cmd = target.dataset.mqCmd; const write = target.dataset.mqWrite; const keystrokes = target.dataset.mqKeystrokes;
        if (cmd) mathField.cmd(cmd); else if (write) mathField.write(write);
        if (keystrokes) { const strokes = keystrokes.split(' '); strokes.forEach(stroke => mathField.keystroke(stroke)); }
        mathField.focus();
    });

    // Math Insert/Cancel Buttons
    insertButton.addEventListener('click', () => {
        const latex = mathField.latex();
        window.parent.postMessage({ type: 'mathquillInsert', latex: latex }, '*');
    });
    cancelButton.addEventListener('click', () => { 
        window.parent.postMessage({ type: 'mathquillCancel' }, '*');
    });

    // Listen for messages from content script
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'loadLatex') {
            try { mathField.latex(data.latex || ''); mathField.focus(); }
            catch (e) { console.error("MQ error setting LaTeX:", e, "Input was:", data.latex); mathField.latex(''); mathField.focus(); }
        } else if (data.type === 'requestLaTeX') { 
            const latex = mathField.latex();
            window.parent.postMessage({ type: 'mathquillInsert', latex: latex }, '*');
        } else if (data.type === 'editorMinimized') { 
            editorWindow.classList.add('editor-minimized');
        } else if (data.type === 'editorRestored') { 
            editorWindow.classList.remove('editor-minimized');
            mathField.focus(); 
        }
    });

    window.parent.postMessage({ type: 'mathquillEditorReady' }, '*');
    mathField.focus();
});