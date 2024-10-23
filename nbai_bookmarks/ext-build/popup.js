// Event listener to handle file selection and generate hierarchical checkboxes
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
      checkboxContainer.innerHTML = '';  // Clear existing content

      // Create an object to store categories and their sub-items
      const categories = {};

      // Parse titles and group by categories
      jsonArray.forEach((item, index) => {
        const { title } = item;
        if (!title || !item.jsonObject) {
          alert("Each item must have a 'title' and 'jsonObject' field.");
          return;
        }

        // Split the title into category and sub-item using '!' as the separator
        const [category, subItem] = title.split('!');

        // Initialize category if not already present
        if (!categories[category]) {
          categories[category] = [];
        }

        // Add the sub-item (or full title if no sub-item) to the category
        categories[category].push({ index, subItem: subItem || title });
      });

      // Create hierarchical list or single checkbox
      Object.keys(categories).forEach(category => {
        const items = categories[category];

        // If there's only one item, display it directly with the category name
        if (items.length === 1) {
          const { index, subItem } = items[0];

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `item-checkbox-${index}`;
          checkbox.checked = false;  // Default unchecked

          const label = document.createElement('label');
          label.htmlFor = `item-checkbox-${index}`;
          label.textContent = `${category}: ${subItem}`; // Show both category and sub-item

          const br = document.createElement('br');

          checkboxContainer.appendChild(checkbox);
          checkboxContainer.appendChild(label);
          checkboxContainer.appendChild(br);
        } else {
          // Create a category header and sub-items if more than one item
          const categoryDiv = document.createElement('div');
          categoryDiv.className = 'category';

          // Add caret icon before the category title
          const caret = document.createElement('span');
          caret.className = 'caret';
          caret.textContent = '▶'; // Caret icon

          const categoryTitle = document.createElement('span');
          categoryTitle.textContent = category;

          categoryDiv.appendChild(caret);
          categoryDiv.appendChild(categoryTitle);

          const subItemsDiv = document.createElement('div');
          subItemsDiv.className = 'sub-items';

          // Add each sub-item with a checkbox
          items.forEach(({ index, subItem }) => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `item-checkbox-${index}`;
            checkbox.checked = false;  // Default unchecked

            const label = document.createElement('label');
            label.htmlFor = `item-checkbox-${index}`;
            label.textContent = subItem;

            const br = document.createElement('br');

            subItemsDiv.appendChild(checkbox);
            subItemsDiv.appendChild(label);
            subItemsDiv.appendChild(br);
          });

          // Toggle visibility of sub-items and rotate caret when clicking the category
          categoryDiv.addEventListener('click', () => {
            const isDisplayed = subItemsDiv.style.display === 'block';
            subItemsDiv.style.display = isDisplayed ? 'none' : 'block';
            caret.textContent = isDisplayed ? '▶' : '▼'; // Toggle caret icon
            categoryDiv.classList.toggle('expanded');  // Toggle expanded state
          });

          // Append category and sub-items to the container
          checkboxContainer.appendChild(categoryDiv);
          checkboxContainer.appendChild(subItemsDiv);
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
  const nbroCheckbox = document.getElementById('nbro-checkbox'); // Get the NBRO checkbox
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
          let { title, jsonObject } = jsonArray[index];

          // Add the `solver_mode: internal` if NBRO is checked
          if (nbroCheckbox.checked) {
            if (jsonObject.options) {
              if (jsonObject.options.objective) {
                jsonObject.options.objective.solver_mode = 'internal';
              } else {
                jsonObject.options.objective = { solver_mode: 'internal' };
              }
            } else {
              jsonObject.options.objective = { solver_mode: 'internal' };
            }
            // Append '-NBRO' to the title
            title = `${title}-NBRO`;
          }

          // Remove the group identifier and '!' separator from the title
          const [_, subItem] = title.split('!'); // Discard the group and keep the sub-item

          const newKey = `optimization-save-data-${subItem.trim()}`; // Store using the sub-item only
          await storeInLocalStorage(newKey, subItem.trim(), jsonObject);
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