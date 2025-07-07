// Event listener to handle file selection and generate hierarchical checkboxes
document
  .getElementById("json-file-input")
  .addEventListener("change", async (event) => {
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
          alert(
            "Invalid JSON format. The file should contain an array of objects."
          );
          return;
        }

        const checkboxContainer = document.getElementById("checkbox-container");
        checkboxContainer.innerHTML = ""; // Clear existing content

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
          const [category, subItem] = title.split("!");

          // Initialize category if not already present
          if (!categories[category]) {
            categories[category] = [];
          }

          // Add the sub-item (or full title if no sub-item) to the category
          categories[category].push({ index, subItem: subItem || title });
        });

        // Create hierarchical list or single checkbox
        Object.keys(categories).forEach((category) => {
          const items = categories[category];

          // If there's only one item, display it directly with the category name
          if (items.length === 1) {
            const { index, subItem } = items[0];

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `item-checkbox-${index}`;
            checkbox.checked = false; // Default unchecked

            const label = document.createElement("label");
            label.htmlFor = `item-checkbox-${index}`;
            label.textContent = `${category}: ${subItem}`; // Show both category and sub-item

            const br = document.createElement("br");

            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            checkboxContainer.appendChild(br);
          } else {
            // Create a category header and sub-items if more than one item
            const categoryDiv = document.createElement("div");
            categoryDiv.className = "category";

            // Add caret icon before the category title
            const caret = document.createElement("span");
            caret.className = "caret";
            caret.textContent = "▶"; // Caret icon

            const categoryTitle = document.createElement("span");
            categoryTitle.textContent = category;

            categoryDiv.appendChild(caret);
            categoryDiv.appendChild(categoryTitle);

            const subItemsDiv = document.createElement("div");
            subItemsDiv.className = "sub-items";

            // Add each sub-item with a checkbox
            items.forEach(({ index, subItem }) => {
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.id = `item-checkbox-${index}`;
              checkbox.checked = false; // Default unchecked

              const label = document.createElement("label");
              label.htmlFor = `item-checkbox-${index}`;
              label.textContent = subItem;

              const br = document.createElement("br");

              subItemsDiv.appendChild(checkbox);
              subItemsDiv.appendChild(label);
              subItemsDiv.appendChild(br);
            });

            // Toggle visibility of sub-items and rotate caret when clicking the category
            categoryDiv.addEventListener("click", () => {
              const isDisplayed = subItemsDiv.style.display === "block";
              subItemsDiv.style.display = isDisplayed ? "none" : "block";
              caret.textContent = isDisplayed ? "▶" : "▼"; // Toggle caret icon
              categoryDiv.classList.toggle("expanded"); // Toggle expanded state
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
document.getElementById("upload-button").addEventListener("click", async () => {
  const fileInput = document.getElementById("json-file-input");
  const nbroCheckbox = document.getElementById("nbro-checkbox"); // Get the NBRO checkbox
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
        alert(
          "Invalid JSON format. The file should contain an array of objects."
        );
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
                jsonObject.options.objective.solver_mode = "internal";
              } else {
                jsonObject.options.objective = { solver_mode: "internal" };
              }
            } else {
              jsonObject.options.objective = { solver_mode: "internal" };
            }
            // Append '-NBRO' to the title
            title = `${title}-NBRO`;
          }

          // Remove the group identifier and '!' separator from the title
          const [_, subItem] = title.split("!"); // Discard the group and keep the sub-item

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
        parsedInputData: jsonObject,
      };
      localStorage.setItem(newKey, JSON.stringify(newJsonObject));

      const savedDataListKey = "optimization-save-data-saved-data-list";
      let savedDataList =
        JSON.parse(localStorage.getItem(savedDataListKey)) || [];

      if (!savedDataList.includes(title)) {
        savedDataList.push(title);
      }

      localStorage.setItem(savedDataListKey, JSON.stringify(savedDataList));
    },
    args: [newKey, title, jsonObject],
  });
}

// Utility to get the current tab ID
async function getCurrentTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.id;
}

function createBookmark(data) {
  const shiftStartInput = document.getElementById("shiftStart").value;
  const shiftEndInput = document.getElementById("shiftEnd").value;
  const nbroCheckbox2 = document.getElementById("nbro-checkbox2");
  const useCase = document.getElementById("usecase-select").value;
  const maxTasks = document.getElementById("maxTasks").value;
  const roundTrip = document.getElementById("roundtrip-checkbox");
  const serviceTimeInput =
    parseInt(document.getElementById("serviceTime").value, 10) || 600;

  let location = "";
  let loc_index = 0;
  let shipments = [];
  let jobs = [];
  let options = {};
  let vehicles = [];
  let locations = [];
  // Function to generate a random integer between min and max (inclusive)
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  // Process each point in pointsArray
  if (useCase === "shipments") {
    data.pointsArray.forEach((p) => {
      let shipment = {
        pickup: {
          id: p.id,
          description: p.name,
          location_index: loc_index++,
          service: serviceTimeInput,
        },
        delivery: {
          id: p.id,
          description: p.business,
          location_index: loc_index++,
          service: serviceTimeInput,
        },
        amount: [getRandomInt(5, 15)], // Set a random value between 5 and 15
      };
      shipments.push(shipment);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
      locations.push(`${p.dropoff_latitude},${p.dropoff_longitude}`);
    });
  } else if (useCase === "jobs") {
    data.pointsArray.forEach((p) => {
      // Convert shift start and end times to Unix timestamps
      const shiftStartUnix = Date.parse(shiftStartInput) / 1000;
      const shiftEndUnix = Date.parse(shiftEndInput) / 1000;

      // Generate a random start time within the shift
      const randomStart = Math.floor(
        Math.random() * (shiftEndUnix - shiftStartUnix - 3600) + shiftStartUnix
      );
      const randomEnd = randomStart + 3600; // 60 minutes later

      let job = {
        id: p.id,
        description: p.name,
        location_index: loc_index++,
        service: serviceTimeInput,

        //delivery: [getRandomInt(5, 15)], // Set a random value between 5 and 15
        time_windows: [[randomStart,randomEnd]] // Add the random time window
      };

      jobs.push(job);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
    });
  } else {
    //mixed 1/2 jobs 1/2 shipments
    const midpoint = Math.ceil(data.pointsArray.length / 2);
    data.pointsArray.slice(0, midpoint).forEach((p) => {
      let job = {
        id: p.id,
        description: p.name,
        location_index: loc_index++,
        service: serviceTimeInput,
        amount: [getRandomInt(5, 15)], // Set a random value between 5 and 15
      };
      jobs.push(job);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
    });
    data.pointsArray.slice(midpoint).forEach((p) => {
      let shipment = {
        pickup: {
          id: p.id,
          description: p.name,
          location_index: loc_index++,
          service: serviceTimeInput,
        },
        delivery: {
          id: p.id,
          description: p.business,
          location_index: loc_index++,
          service: serviceTimeInput,
        },
        amount: [getRandomInt(5, 15)], // Set a random value between 5 and 15
      };
      shipments.push(shipment);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
      locations.push(`${p.dropoff_latitude},${p.dropoff_longitude}`);
    });
  }

  // Process each vehicle in vehicleArray
  data.vehicleArray.forEach((f) => {
    locations.push(`${f.latitude},${f.longitude}`);
    let vehicle = {
      id: f.id,
      description: f.vin,
      start_index: loc_index,
      time_window: [
        Date.parse(shiftStartInput) / 1000, // Use shiftStart input value
        Date.parse(shiftEndInput) / 1000, // Use shiftEnd input value
      ],
      capacity: [f.capacity],
      skills: f.attr3,
      costs: {
        fixed: 1200,
      }
    };
    // Add end_index only if roundTrip checkbox is checked
    if (roundTrip.checked) {
      vehicle.end_index = loc_index++;
    } else {
      loc_index++; // Increment loc_index even if end_index is not added
    }
    if (maxTasks) {
      vehicle.max_tasks = parseInt(maxTasks, 10);
    }
    vehicles.push(vehicle);
  });

  if (nbroCheckbox2.checked) {
    options = {
      objective: { solver_mode: "internal" },
    };
  } else {
  }
  const bookmark = {
    locations: { id: 1, location: locations },
    location_index: loc_index,
    shipments: shipments,
    jobs: jobs,
    vehicles: vehicles,
    options: options,
  };

  // Copy the result to the clipboard
  const bookmarkText = JSON.stringify(bookmark, null, 2); // Pretty-printed JSON
  navigator.clipboard
    .writeText(bookmarkText)
    .then(() => {
      alert(
        "Sample copied to clipboard - paste into the NB.ai Route Planner input panel."
      );
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
      alert("Failed to copy data to clipboard.");
    });

  return bookmark;
}

document.addEventListener("DOMContentLoaded", async () => {
  // Set initial values for shiftStart and shiftEnd
  const shiftStartInput = document.getElementById("shiftStart");
  const shiftEndInput = document.getElementById("shiftEnd");

  // Calculate tomorrow's date at 08:00 in local time
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    8,
    0,
    0
  );

  // Calculate shift end (8 hours after shift start)
  const shiftEnd = new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000);

  // Format the dates to 'YYYY-MM-DDTHH:MM' for the input fields
  const formatDateTime = (date) => {
    const pad = (num) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Set the initial values
  shiftStartInput.value = formatDateTime(tomorrow);
  shiftEndInput.value = formatDateTime(shiftEnd);

  const citySelect = document.getElementById("city-select");
  const nbrSelect = document.getElementById("nbr-select");
  const vehSelect = document.getElementById("veh-select");

  document
    .getElementById("sample-button")
    .addEventListener("click", async () => {
      const selectedCity = citySelect.value;
      const selectedNbr = nbrSelect.value;
      const selectedVeh = vehSelect.value;
      // Construct the API URL
      const apiUrl = `https://m4aqpzp5ah6n7ilzunwyo5ma2u0ezqcc.lambda-url.us-east-2.on.aws/?region=${selectedCity}&vehicles=${selectedVeh}&number=${selectedNbr}&type=darp`;

      // Make the API request
      fetch(apiUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          createBookmark(data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          alert("Failed to fetch data. Please try again.");
        });
    });

  const nbroCheckbox = document.getElementById("nbro-checkbox");
  const nbroCheckbox2 = document.getElementById("nbro-checkbox2");
  // Disable the NBRO checkbox by default
  nbroCheckbox.disabled = false;
  nbroCheckbox2.disabled = false;
});
