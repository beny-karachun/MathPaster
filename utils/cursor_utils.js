// utils/cursor_utils.js

function getSelectionDetails(element) {
    const isContentEditable = element.isContentEditable;
    let selectionStart, selectionEnd, selectedText = "";

    if (isContentEditable) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (element.contains(range.commonAncestorContainer)) {
                const preSelectionRange = range.cloneRange();
                preSelectionRange.selectNodeContents(element);
                preSelectionRange.setEnd(range.startContainer, range.startOffset);
                selectionStart = preSelectionRange.toString().length;
                selectionEnd = selectionStart + range.toString().length;
                selectedText = range.toString();
            } else { // Selection is outside the target element
                selectionStart = 0;
                selectionEnd = 0;
            }
        } else {
            selectionStart = element.textContent.length; // Default to end if no selection
            selectionEnd = element.textContent.length;
        }
    } else { // Input or Textarea
        selectionStart = element.selectionStart;
        selectionEnd = element.selectionEnd;
        selectedText = element.value.substring(selectionStart, selectionEnd);
    }
    return { start: selectionStart, end: selectionEnd, text: selectedText };
}

function insertText(element, textToInsert, selectionDetails) {
    const isContentEditable = element.isContentEditable;

    if (isContentEditable) {
        element.focus(); // Ensure focus for execCommand
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let range = selection.getRangeAt(0);
            // Check if the current selection is within the target element
            if (!element.contains(range.commonAncestorContainer)) {
                // If not, create a new range at the end of the element
                range = document.createRange();
                range.selectNodeContents(element);
                range.collapse(false); // Collapse to the end
            }
            
            // If we have specific start/end from selectionDetails (e.g. for replacing)
            // This part is trickier for contenteditable and might need more robust range manipulation
            // For simplicity, current execCommand will replace current selection or insert at cursor
            // If accurate replacement of a known range is needed, more complex range logic is required
            range.deleteContents(); // Delete selected text
            range.insertNode(document.createTextNode(textToInsert));
            // Move cursor after inserted text
            range.setStart(range.endContainer, range.endOffset);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

        } else { // Fallback if no selection, insert at end
            element.appendChild(document.createTextNode(textToInsert));
        }
    } else { // Input or Textarea
        const currentVal = element.value;
        const start = selectionDetails ? selectionDetails.start : element.selectionStart;
        const end = selectionDetails ? selectionDetails.end : element.selectionEnd;

        element.value = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
        
        const newCursorPos = start + textToInsert.length;
        element.selectionStart = newCursorPos;
        element.selectionEnd = newCursorPos;
    }

    // Dispatch input event for frameworks
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); // Some frameworks listen for change
}

// Make functions available if not using modules (content scripts don't use ES6 modules by default)
window.cursorUtils = { getSelectionDetails, insertText };