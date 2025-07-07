// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "modifyJSON") {
        console.log('modifyJSON msg received...');
        try {
            // Locate the Monaco Editor
            const editorElement = document.querySelector('.monaco-editor');
            console.log(editorElement);
            if (!editorElement) {
                console.error('Monaco editor not found');
                sendResponse({ success: false, message: "Monaco editor not found" });
                return;
            }

            // Ensure the Monaco global object is available
            if (window.monaco) {
                const editorInstance = window.monaco.editor.getEditors().find(editor =>
                    editor.getDomNode() === editorElement
                );

                if (editorInstance) {
                    // Get editor content
                    const model = editorInstance.getModel();
                    const jsonContent = model.getValue(); // The JSON as a string

                    console.log('Original JSON:', jsonContent);

                    // Parse the JSON
                    let data;
                    try {
                        data = JSON.parse(jsonContent);
                    } catch (e) {
                        console.error('Invalid JSON content:', e);
                        sendResponse({ success: false, message: "Invalid JSON content" });
                        return;
                    }

                    // Modify the JSON
                    data.jobs.forEach(job => {
                        if (!job.metadata) {
                            const [customer_name, ...addressParts] = job.description.split("-");
                            const address = addressParts.join("-").trim();
                            job.metadata = {
                                address,
                                customer_name: customer_name.trim(),
                                name: customer_name.trim(),
                                notes: "",
                                instructions: ""
                            };
                        }
                    });

                    // Update the editor with the modified JSON
                    const updatedContent = JSON.stringify(data, null, 2);
                    model.setValue(updatedContent);

                    console.log('Updated JSON:', updatedContent);
                    sendResponse({ success: true, message: "Metadata added successfully" });
                } else {
                    console.error('Editor instance not found');
                    sendResponse({ success: false, message: "Editor instance not found" });
                }
            } else {
                console.error('Monaco global object not available');
                sendResponse({ success: false, message: "Monaco global object not available" });
            }
        } catch (error) {
            console.error('Error modifying JSON:', error);
            sendResponse({ success: false, message: "Error modifying JSON" });
        }
    }
    return true; // Keep the message channel open for asynchronous responses
});