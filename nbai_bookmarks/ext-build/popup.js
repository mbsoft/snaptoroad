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
  const useCase = document.getElementById("usecase-select").value;
  const maxTasks = document.getElementById("maxTasks").value;
  const roundTrip = document.getElementById("roundtrip-checkbox");
  const nbroCheckbox2 = document.getElementById("nbro-checkbox2");
  const serviceTimeInput =
    (parseInt(document.getElementById("serviceTime").value, 10) || 10) * 60; // Convert minutes to seconds
  const proximityFactor = parseInt(document.getElementById("proximityFactor").value, 10) || 0;
  const depotEnabled = document.getElementById("depot-checkbox").checked;

  let location = "";
  let loc_index = 0;
  let shipments = [];
  let jobs = [];
  let options = {};
  let vehicles = [];
  let locations = [];
  
  // If depot is enabled, store the first vehicle's location
  let depotLocationIndex = -1;
  if (depotEnabled && data.vehicleArray.length > 0) {
    const firstVehicle = data.vehicleArray[0];
    locations.push(`${firstVehicle.latitude},${firstVehicle.longitude}`);
    depotLocationIndex = loc_index++;
  }
  
  // Function to generate a random integer between min and max (inclusive)
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // Extract all available skills from vehicles first
  const allVehicleSkills = [];
  data.vehicleArray.forEach(v => {
    if (v.attr3 && Array.isArray(v.attr3)) {
      v.attr3.forEach(skill => {
        if (!allVehicleSkills.includes(skill)) {
          allVehicleSkills.push(skill);
        }
      });
    }
  });
  
  // Function to get a single random skill from available vehicle skills
  function getRandomSkill() {
    if (allVehicleSkills.length === 0) return [];
    const randomIndex = getRandomInt(0, allVehicleSkills.length - 1);
    const skill = allVehicleSkills[randomIndex];
    return [skill];
  }
  
  // Check if skills toggle is enabled
  const skillsEnabled = document.getElementById("skills-checkbox").checked;
  // Check if time windows toggle is enabled
  const timeWindowsEnabled = document.getElementById("timewindows-checkbox").checked;
  
  // Function to generate a random time window within shift hours
  function generateTimeWindow(shiftStartUnix, shiftEndUnix) {
    if (shiftEndUnix - shiftStartUnix < 3600) {
      return [shiftStartUnix, shiftEndUnix];
    }
    const latestStartTime = shiftEndUnix - 3600;
    let randomStart = Math.floor(Math.random() * (latestStartTime - shiftStartUnix) + shiftStartUnix);
    randomStart = Math.round(randomStart / 3600) * 3600;
    if (randomStart < shiftStartUnix) {
      randomStart = shiftStartUnix;
    } else if (randomStart > latestStartTime) {
      randomStart = Math.floor(latestStartTime / 3600) * 3600;
    }
    const randomEnd = randomStart + 3600;
    return [randomStart, randomEnd];
  }
  
  // Process each point in pointsArray
  if (useCase === "shipments") {
    data.pointsArray.forEach((p) => {
      const shiftStartUnix = Date.parse(shiftStartInput) / 1000;
      const shiftEndUnix = Date.parse(shiftEndInput) / 1000;
  
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
        amount: [getRandomInt(5, 15)],
      };
      
      if (skillsEnabled) {
        shipment.skills = getRandomSkill();
      }
      
      if (timeWindowsEnabled) {
        const pickupTimeWindow = generateTimeWindow(shiftStartUnix, shiftEndUnix - 7200);
        shipment.pickup.time_windows = [pickupTimeWindow];
        
        const minTravelTime = 1800;
        const earliestDeliveryStart = pickupTimeWindow[1] + minTravelTime;
        
        if (earliestDeliveryStart < shiftEndUnix - 3600) {
          const deliveryStart = Math.min(
            earliestDeliveryStart,
            Math.round((shiftEndUnix - 3600) / 3600) * 3600
          );
          const deliveryEnd = deliveryStart + 3600;
          shipment.delivery.time_windows = [[deliveryStart, deliveryEnd]];
        } else {
          const latestPossibleStart = Math.max(earliestDeliveryStart, shiftEndUnix - 3600);
          shipment.delivery.time_windows = [[latestPossibleStart, shiftEndUnix]];
        }
      }
      
      shipments.push(shipment);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
      locations.push(`${p.dropoff_latitude},${p.dropoff_longitude}`);
    });
  } else if (useCase === "jobs") {
    data.pointsArray.forEach((p) => {
      // Convert shift start and end times to Unix timestamps
      const shiftStartUnix = Date.parse(shiftStartInput) / 1000;
      const shiftEndUnix = Date.parse(shiftEndInput) / 1000;

      let job = {
        id: p.id,
        description: p.name,
        location_index: loc_index++,
        service: serviceTimeInput,
        delivery: [getRandomInt(5, 15)]
      };
      
      // Add skills only if skills toggle is enabled
      if (skillsEnabled) {
        job.skills = getRandomSkill();
      }
      
      // Add time windows only if time windows toggle is enabled
      if (timeWindowsEnabled) {
        job.time_windows = [generateTimeWindow(shiftStartUnix, shiftEndUnix)];
      }

      jobs.push(job);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
    });
  } else {
    //mixed 1/2 jobs 1/2 shipments
    const midpoint = Math.ceil(data.pointsArray.length / 2);
    
    // Convert shift start and end times to Unix timestamps
    const shiftStartUnix = Date.parse(shiftStartInput) / 1000;
    const shiftEndUnix = Date.parse(shiftEndInput) / 1000;
    
    data.pointsArray.slice(0, midpoint).forEach((p) => {
      let job = {
        id: p.id,
        description: p.name,
        location_index: loc_index++,
        service: serviceTimeInput,
        amount: [getRandomInt(5, 15)], // Set a random value between 5 and 15
      };
      
      // Add skills only if skills toggle is enabled
      if (skillsEnabled) {
        job.skills = getRandomSkill();
      }
      
      // Add time windows only if time windows toggle is enabled
      if (timeWindowsEnabled) {
        job.time_windows = [generateTimeWindow(shiftStartUnix, shiftEndUnix)];
      }
      
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
      
      // Add skills only if skills toggle is enabled
      if (skillsEnabled) {
        shipment.skills = getRandomSkill();
      }
      
      // Add time windows only if time windows toggle is enabled
      if (timeWindowsEnabled) {
        // Generate pickup time window
        const pickupTimeWindow = generateTimeWindow(shiftStartUnix, shiftEndUnix - 7200);
        shipment.pickup.time_windows = [pickupTimeWindow];
        
        // For delivery, ensure it starts after pickup ends
        const minTravelTime = 1800; // Assume minimum 30 minutes travel time
        const earliestDeliveryStart = pickupTimeWindow[1] + minTravelTime;
        
        if (earliestDeliveryStart < shiftEndUnix - 3600) {
          const deliveryStart = Math.min(
            earliestDeliveryStart,
            Math.round((shiftEndUnix - 3600) / 3600) * 3600
          );
          const deliveryEnd = deliveryStart + 3600;
          shipment.delivery.time_windows = [[deliveryStart, deliveryEnd]];
        } else {
          const latestPossibleStart = Math.max(earliestDeliveryStart, shiftEndUnix - 3600);
          shipment.delivery.time_windows = [[latestPossibleStart, shiftEndUnix]];
        }
      }
      
      shipments.push(shipment);
      locations.push(`${p.pickup_latitude},${p.pickup_longitude}`);
      locations.push(`${p.dropoff_latitude},${p.dropoff_longitude}`);
    });
  }

  // Process each vehicle in vehicleArray
  data.vehicleArray.forEach((f) => {
    if (!depotEnabled) {
      // If depot is disabled, add each vehicle's unique location
      locations.push(`${f.latitude},${f.longitude}`);
    }
    
    let vehicle = {
      id: f.id,
      description: f.vin,
      start_index: depotEnabled ? depotLocationIndex : loc_index,
      time_window: [
        Date.parse(shiftStartInput) / 1000,
        Date.parse(shiftEndInput) / 1000,
      ],
      capacity: [500],
      skills: f.attr3,
      costs: {
        fixed: 3600,
      }
    };

    // Add HOS configuration based on selection
    const hosValue = document.getElementById("hos-select").value;
    if (hosValue !== 'none') {
      const hosConfigs = {
        0: { max_continuous_driving: 36000, layover_duration: 7200, include_service_time: true },    // USFed607LH
        1: { max_continuous_driving: 28800, layover_duration: 7200, include_service_time: true },    // USFed708LH
        2: { max_continuous_driving: 36000, layover_duration: 7200, include_service_time: true },    // CanadaCycle1
        3: { max_continuous_driving: 28800, layover_duration: 7200, include_service_time: true },    // CanadaCycle2
        4: { max_continuous_driving: 28800, layover_duration: 7200, include_service_time: true },    // California808
        5: { max_continuous_driving: 25200, layover_duration: 7200, include_service_time: true },    // Texas707
        6: { max_continuous_driving: 14400, layover_duration: 7200, include_service_time: true },    // USShortHaul
        7: { max_continuous_driving: 25200, layover_duration: 7200, include_service_time: true }     // Europe
      };
      
      vehicle.drive_time_layover_config = hosConfigs[parseInt(hosValue)];
    }
    
    if (roundTrip.checked) {
      vehicle.end_index = depotEnabled ? depotLocationIndex : loc_index;
    }
    
    if (!depotEnabled) {
      loc_index++; // Only increment location index if not using depot
    }
    
    if (maxTasks) {
      vehicle.max_tasks = parseInt(maxTasks, 10);
    }
    
    vehicles.push(vehicle);
  });

  // Modify the options section
  if (nbroCheckbox2.checked) {
    options = {
      routing: {
        mode: "car",
        traffic_timestamp: Date.parse(shiftStartInput) / 1000
      },
      objective: { 
        custom: {
          "type": "min",
          "value": "vehicles"
        },
        solver_mode: "internal" 
      },
      grouping: {
        proximity_factor: proximityFactor
      }
    };
  } else {
    options = {
      objective: { 
        custom: {
          "type": "min",
          "value": "vehicles"
        },
        solver_mode: "internal" 
      },
      grouping: {
        proximity_factor: proximityFactor
      }
    };
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

// Modify the saveToCache function to store all parameters
async function saveToCache(data) {
  try {
    const cacheData = {
      pointsArray: data.pointsArray,
      vehicleArray: data.vehicleArray,
      parameters: {
        shiftStart: document.getElementById("shiftStart").value,
        shiftEnd: document.getElementById("shiftEnd").value,
        serviceTime: document.getElementById("serviceTime").value,
        maxTasks: document.getElementById("maxTasks").value,
        proximityFactor: document.getElementById("proximityFactor").value,
        useCase: document.getElementById("usecase-select").value,
        selectedCity: document.getElementById("city-select").value,
        selectedNbr: document.getElementById("nbr-select").value,
        selectedVeh: document.getElementById("veh-select").value,
        selectedHos: document.getElementById("hos-select").value,
        // Checkboxes
        skills: document.getElementById("skills-checkbox").checked,
        timeWindows: document.getElementById("timewindows-checkbox").checked,
        roundTrip: document.getElementById("roundtrip-checkbox").checked,
        depot: document.getElementById("depot-checkbox").checked,
      },
      timestamp: Date.now()
    };
    localStorage.setItem('nbai_route_cache', JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

async function loadFromCache() {
  try {
    const cachedData = localStorage.getItem('nbai_route_cache');
    return cachedData ? JSON.parse(cachedData) : null;
  } catch (error) {
    console.error('Error loading from cache:', error);
    return null;
  }
}

function downloadCSV(data, cityName, useCase) {
  // Generate a route name (using city name or a default)
  const routeName = cityName.toUpperCase();
  
  // CSV header
  const headers = ['Route', 'ID Code', 'Address', 'Business', 'Code Type', 'Task Type', 'Location'];
  let csvContent = headers.join(',') + '\n';
  
  // Function to escape CSV fields
  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  
  // Generate rows from pointsArray
  data.pointsArray.forEach((point, index) => {
    const idCode = `D-${index + 1}`;
    
    if (useCase === 'shipments' || (useCase === 'mixed' && index >= Math.ceil(data.pointsArray.length / 2))) {
      // For shipments, create two rows: pickup and delivery
      
      // Pickup row
      const pickupRow = [
        escapeCSV(routeName),
        escapeCSV(idCode),
        escapeCSV(point.address || `${point.pickup_latitude}, ${point.pickup_longitude}`),
        escapeCSV(point.business || 'FALSE'),
        escapeCSV('P'),
        escapeCSV('Pickup'),
        escapeCSV(`${point.pickup_latitude},${point.pickup_longitude}`)
      ];
      csvContent += pickupRow.join(',') + '\n';
      
      // Delivery row
      const deliveryRow = [
        escapeCSV(routeName),
        escapeCSV(idCode),
        escapeCSV(point.address || `${point.dropoff_latitude}, ${point.dropoff_longitude}`),
        escapeCSV(point.business || 'FALSE'),
        escapeCSV('D'),
        escapeCSV('Delivery'),
        escapeCSV(`${point.dropoff_latitude},${point.dropoff_longitude}`)
      ];
      csvContent += deliveryRow.join(',') + '\n';
    } else {
      // For jobs, create one delivery row
      const row = [
        escapeCSV(routeName),
        escapeCSV(idCode),
        escapeCSV(point.address || `${point.pickup_latitude}, ${point.pickup_longitude}`),
        escapeCSV(point.business || 'FALSE'),
        escapeCSV('D'),
        escapeCSV('Delivery'),
        escapeCSV(`${point.pickup_latitude},${point.pickup_longitude}`)
      ];
      csvContent += row.join(',') + '\n';
    }
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${cityName}_jobs.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`CSV file "${cityName}_jobs.csv" has been downloaded.`);
}

function downloadVehiclesCSV(data, cityName) {
  // Get shift start and end times from the form
  const shiftStartInput = document.getElementById("shiftStart").value;
  const shiftEndInput = document.getElementById("shiftEnd").value;
  
  // CSV header for vehicles
  const headers = ['Vehicle ID', 'VIN', 'Latitude', 'Longitude', 'Skills', 'Start Time', 'End Time', 'Location'];
  let csvContent = headers.join(',') + '\n';
  
  // Function to escape CSV fields
  const escapeCSV = (field) => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  
  // Generate rows from vehicleArray
  data.vehicleArray.forEach((vehicle, index) => {
    const skills = vehicle.attr3 && Array.isArray(vehicle.attr3) ? vehicle.attr3.join(',') : '';
    
    const row = [
      escapeCSV(vehicle.id || `VEH-${index + 1}`),
      escapeCSV(vehicle.vin || ''),
      escapeCSV(vehicle.latitude),
      escapeCSV(vehicle.longitude),
      escapeCSV(skills), // Will be quoted if contains commas
      escapeCSV(shiftStartInput),
      escapeCSV(shiftEndInput),
      escapeCSV(`${vehicle.latitude},${vehicle.longitude}`)
    ];
    csvContent += row.join(',') + '\n';
  });
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${cityName}_vehicles.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log(`CSV file "${cityName}_vehicles.csv" has been downloaded.`);
}

// City data organized by region
const cityData = {
  'north-america': [
    { value: 'chicago', label: 'Chicago' },
    { value: 'charlotte', label: 'Charlotte' },
    { value: 'columbus', label: 'Columbus' },
    { value: 'dallas', label: 'Dallas' },
    { value: 'dublin', label: 'Dublin, OH' },
    { value: 'houston', label: 'Houston' },
    { value: 'la', label: 'Los Angeles' },
    { value: 'mexico', label: 'Mexico City' },
    { value: 'minneapolis', label: 'Minneapolis' },
    { value: 'newyork', label: 'New York' },
    { value: 'seattle', label: 'Seattle' },
    { value: 'toronto', label: 'Toronto' }
  ],
  'europe': [
    { value: 'berlin', label: 'Berlin' },
    { value: 'hamburg', label: 'Hamburg' },
    { value: 'helsinki', label: 'Helsinki' },
    { value: 'london', label: 'London' },
    { value: 'oslo', label: 'Oslo' },
    { value: 'paris', label: 'Paris' },
    { value: 'czech', label: 'Prague' }
  ],
  'asia-pacific': [
    { value: 'bangalore', label: 'Bangalore' },
    { value: 'chennai', label: 'Chennai' },
    { value: 'delhi', label: 'Delhi' },
    { value: 'dubai', label: 'Dubai' },
    { value: 'hyderabad', label: 'Hyderabad' },
    { value: 'singapore', label: 'Singapore' },
    { value: 'sydney', label: 'Sydney' },
    { value: 'telaviv', label: 'Tel Aviv' }
  ],
  'south-america': [
    { value: 'saopaulo', label: 'São Paulo' },
    { value: 'santiago', label: 'Santiago' }
  ],
  'long-distance': [
    { value: 'usa', label: 'USA - Long Distance' },
    { value: 'eu', label: 'Europe - Long Distance' }
  ]
};

// Populate cities based on selected region
function populateCities(region, selectedCity = null) {
  const citySelect = document.getElementById('city-select');
  const cities = cityData[region] || [];
  
  citySelect.innerHTML = '';
  
  cities.forEach((city, index) => {
    const option = document.createElement('option');
    option.value = city.value;
    option.textContent = city.label;
    
    // Select chicago by default for north-america, or first city for others, or the specified city
    if (selectedCity && city.value === selectedCity) {
      option.selected = true;
    } else if (!selectedCity && ((region === 'north-america' && city.value === 'chicago') || index === 0)) {
      option.selected = true;
    }
    
    citySelect.appendChild(option);
  });
}

// Sync multi-select options with hidden checkboxes
function syncOptionsSelect() {
  const optionsSelect = document.getElementById('options-select');
  const selectedValues = Array.from(optionsSelect.selectedOptions).map(opt => opt.value);
  
  // Update hidden checkboxes based on multi-select
  document.getElementById('roundtrip-checkbox').checked = selectedValues.includes('roundtrip');
  document.getElementById('nbro-checkbox2').checked = selectedValues.includes('traffic');
  document.getElementById('skills-checkbox').checked = selectedValues.includes('skills');
  document.getElementById('timewindows-checkbox').checked = selectedValues.includes('timewindows');
  document.getElementById('depot-checkbox').checked = selectedValues.includes('depot');
  document.getElementById('cache-checkbox').checked = selectedValues.includes('cache');
  
  // Update selected options display text
  updateSelectedOptionsDisplay();
}

// Update the display text showing selected options
function updateSelectedOptionsDisplay() {
  const optionsSelect = document.getElementById('options-select');
  const selectedOptionsText = document.getElementById('selected-options-text');
  
  const selectedOptions = Array.from(optionsSelect.selectedOptions).map(opt => opt.textContent);
  
  if (selectedOptions.length > 0) {
    selectedOptionsText.textContent = '(' + selectedOptions.join(', ') + ')';
  } else {
    selectedOptionsText.textContent = '(None selected)';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize cascading region/city selectors
  const regionSelect = document.getElementById('region-select');
  if (regionSelect) {
    // Populate cities for the default region
    populateCities(regionSelect.value);
    
    // Add event listener for region changes
    regionSelect.addEventListener('change', (e) => {
      populateCities(e.target.value);
    });
  }
  
  // Add event listener for options multi-select
  const optionsSelect = document.getElementById('options-select');
  if (optionsSelect) {
    optionsSelect.addEventListener('change', syncOptionsSelect);
    // Initial sync
    syncOptionsSelect();
  }
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
      const selectedNbr = parseInt(nbrSelect.value, 10);
      const selectedVeh = parseInt(vehSelect.value, 10);
      const cacheEnabled = document.getElementById("cache-checkbox").checked;

      // Try to load from cache first if enabled
      if (cacheEnabled) {
        const cachedData = await loadFromCache();
        if (cachedData) {
          // Create a new object with limited arrays
          const limitedData = {
            pointsArray: cachedData.pointsArray.slice(0, selectedNbr),
            vehicleArray: cachedData.vehicleArray.slice(0, selectedVeh)
          };
          createBookmark(limitedData);
          return;
        }
      }

      // If cache is disabled or no cached data exists, proceed with API call
      const apiUrl = `https://m4aqpzp5ah6n7ilzunwyo5ma2u0ezqcc.lambda-url.us-east-2.on.aws/?region=${selectedCity}&vehicles=${selectedVeh}&number=${selectedNbr}&type=darp`;

      fetch(apiUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(async (data) => {
          // Always save to cache when new data is retrieved
          await saveToCache(data);
          createBookmark(data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          alert("Failed to fetch data. Please try again.");
        });
    });

    const nbroCheckbox2 = document.getElementById("nbro-checkbox2");
    // Disable the NBRO checkbox by default
    nbroCheckbox2.disabled = false;
  // Set cache checkbox to unchecked by default (changed from original default)
  const cacheCheckbox = document.getElementById("cache-checkbox");
  if (cacheCheckbox) {
    cacheCheckbox.checked = false;
  }

  // Add event listener for cache checkbox
  cacheCheckbox.addEventListener('change', async function() {
    if (this.checked) {
      const cachedData = await loadFromCache();
      if (cachedData && cachedData.parameters) {
        // Restore all input values
        document.getElementById("shiftStart").value = cachedData.parameters.shiftStart;
        document.getElementById("shiftEnd").value = cachedData.parameters.shiftEnd;
        document.getElementById("serviceTime").value = cachedData.parameters.serviceTime;
        document.getElementById("maxTasks").value = cachedData.parameters.maxTasks;
        document.getElementById("proximityFactor").value = cachedData.parameters.proximityFactor;
        document.getElementById("usecase-select").value = cachedData.parameters.useCase;
        document.getElementById("city-select").value = cachedData.parameters.selectedCity;
        document.getElementById("nbr-select").value = cachedData.parameters.selectedNbr;
        document.getElementById("veh-select").value = cachedData.parameters.selectedVeh;
        document.getElementById("hos-select").value = cachedData.parameters.selectedHos;
        
        // Restore checkbox states
        document.getElementById("skills-checkbox").checked = cachedData.parameters.skills;
        document.getElementById("timewindows-checkbox").checked = cachedData.parameters.timeWindows;
        document.getElementById("roundtrip-checkbox").checked = cachedData.parameters.roundTrip;
        document.getElementById("depot-checkbox").checked = cachedData.parameters.depot;
        
        // Update multi-select to match checkboxes
        const optionsSelect = document.getElementById('options-select');
        const selectedOptions = [];
        if (cachedData.parameters.roundTrip) selectedOptions.push('roundtrip');
        if (cachedData.parameters.skills) selectedOptions.push('skills');
        if (cachedData.parameters.timeWindows) selectedOptions.push('timewindows');
        if (cachedData.parameters.depot) selectedOptions.push('depot');
        selectedOptions.push('cache'); // Always select cache when loading from cache
        
        Array.from(optionsSelect.options).forEach(option => {
          option.selected = selectedOptions.includes(option.value);
        });
        
        // Update the display text
        updateSelectedOptionsDisplay();
      }
    }
  });

  // Initialize depot checkbox state - now enabled by default
  const depotCheckbox = document.getElementById("depot-checkbox");
  depotCheckbox.checked = true; // Default to enabled

  // Download CSV button handler
  document
    .getElementById("download-csv-button")
    .addEventListener("click", async () => {
      const selectedCity = citySelect.value;
      const selectedNbr = parseInt(nbrSelect.value, 10);
      const selectedVeh = parseInt(vehSelect.value, 10);
      const cacheEnabled = document.getElementById("cache-checkbox").checked;
      const useCase = document.getElementById("usecase-select").value;

      // Try to load from cache first if enabled
      if (cacheEnabled) {
        const cachedData = await loadFromCache();
        if (cachedData) {
          // Create a new object with limited arrays
          const limitedData = {
            pointsArray: cachedData.pointsArray.slice(0, selectedNbr),
            vehicleArray: cachedData.vehicleArray.slice(0, selectedVeh)
          };
          downloadCSV(limitedData, selectedCity, useCase);
          downloadVehiclesCSV(limitedData, selectedCity);
          alert(`CSV files downloaded: "${selectedCity}_jobs.csv" and "${selectedCity}_vehicles.csv"`);
          return;
        }
      }

      // If cache is disabled or no cached data exists, proceed with API call
      const apiUrl = `https://m4aqpzp5ah6n7ilzunwyo5ma2u0ezqcc.lambda-url.us-east-2.on.aws/?region=${selectedCity}&vehicles=${selectedVeh}&number=${selectedNbr}&type=darp`;

      fetch(apiUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(async (data) => {
          // Always save to cache when new data is retrieved
          await saveToCache(data);
          downloadCSV(data, selectedCity, useCase);
          downloadVehiclesCSV(data, selectedCity);
          alert(`CSV files downloaded: "${selectedCity}_jobs.csv" and "${selectedCity}_vehicles.csv"`);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          alert("Failed to fetch data. Please try again.");
        });
    });
});
