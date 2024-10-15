// Event listener to handle file selection and generate checkboxes
document.getElementById('json-file-input').addEventListener('change', async (event) => {
  const fileInput = event.target;
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file.");
    return;
  }

  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const fileContent = event.target.result;
      const jsonArray = JSON.parse(fileContent);

      if (!Array.isArray(jsonArray)) {
        alert("Invalid JSON format. The file should contain an array of objects.");
        return;
      }

      const checkboxContainer = document.getElementById('checkbox-container');
      checkboxContainer.innerHTML = '<input type="checkbox" id="select-all-checkbox" /> Select All<br><br>';  // Reset checkboxes and add "Select All"

      // Create a checkbox for each item in the array
      jsonArray.forEach((item, index) => {
        const { title } = item;
        if (!title || !item.jsonObject) {
          alert("Each item must have a 'title' and 'jsonObject' field.");
          return;
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `item-checkbox-${index}`;
        checkbox.checked = false;  // Default unchecked

        const label = document.createElement('label');
        label.htmlFor = `item-checkbox-${index}`;
        label.textContent = title;

        const br = document.createElement('br');

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        checkboxContainer.appendChild(br);
      });

      // Add event listener for "Select All" checkbox
      const selectAllCheckbox = document.getElementById('select-all-checkbox');
      selectAllCheckbox.addEventListener('change', () => {
        const isChecked = selectAllCheckbox.checked;
        for (let index = 0; index < jsonArray.length; index++) {
          const checkbox = document.getElementById(`item-checkbox-${index}`);
          checkbox.checked = isChecked; // Set all checkboxes to match "Select All"
        }
      });
      
    } catch (error) {
      alert("Error reading file: " + error.message);
    }
  };

  reader.readAsText(file);
});

// Event listener to handle uploading selected checkboxes
document.getElementById('upload-button').addEventListener('click', async () => {
  const fileInput = document.getElementById('json-file-input');
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a file first.");
    return;
  }

  const reader = new FileReader();

  reader.onload = async (event) => {
    try {
      const fileContent = event.target.result;
      const jsonArray = JSON.parse(fileContent);

      if (!Array.isArray(jsonArray)) {
        alert("Invalid JSON format. The file should contain an array of objects.");
        return;
      }

      // Upload selected items when the button is clicked
      for (let index = 0; index < jsonArray.length; index++) {
        const checkbox = document.getElementById(`item-checkbox-${index}`);
        if (checkbox.checked) {
          const { title, jsonObject } = jsonArray[index];
          const newKey = `optimization-save-data-${title}`;
          await storeInLocalStorage(newKey, title, jsonObject);
        }
      }
      alert("Selected NB.ai Bookmarks Saved!");
      
    } catch (error) {
      alert("Error reading file: " + error.message);
    }
  };

  reader.readAsText(file);
});

// Function to handle storing each key-value pair and updating the saved-data-list
async function storeInLocalStorage(newKey, title, jsonObject) {
  chrome.scripting.executeScript({
    target: { tabId: await getCurrentTabId() },
    func: (newKey, title, jsonObject) => {
      const newJsonObject = {
        parsedInputData: jsonObject
      };
      localStorage.setItem(newKey, JSON.stringify(newJsonObject));

      const savedDataListKey = 'optimization-save-data-saved-data-list';
      let savedDataList = JSON.parse(localStorage.getItem(savedDataListKey)) || [];

      if (!savedDataList.includes(title)) {
        savedDataList.push(title);
      }

      localStorage.setItem(savedDataListKey, JSON.stringify(savedDataList));
    },
    args: [newKey, title, jsonObject]
  });
}

// Utility to get the current tab ID
async function getCurrentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.id;
}