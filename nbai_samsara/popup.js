

const providers = {
  Samsara: {
    endpoints: {
      vehicles:
        "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/fleet/vehicles",
      addresses:
        "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/addresses",
      vehicleLocations:
        "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/fleet/vehicles/locations",
      tags: "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/tags",
    },
    getHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
    }),
    buildAddressUrl: (base, tagId) => {
      return tagId ? `${base}?tagIds=${tagId}` : base;
    },
    getVehicleLocationParam: (vehicleId) => `?vehicleId=${vehicleId}`,
    getVehicleLocation: (response, vehicleId) => {
      const locationData = response.data.find((loc) => loc.id === vehicleId);
      return locationData ? locationData.location : null;
    },
    getVehicles: (response) => response.data,
    processCombinedData: (combinedData, shiftStart, shiftEnd) => {
      const nbaiVeh = [];
      const nbaiJobs = [];
      const nbaiLoc = { id: 1, location: [] };
      let locIndex = 0;
      const serviceTime = document.getElementById("serviceTime").value;
      const maxTasks = document.getElementById("maxTasks").value;

      combinedData.vehicles.forEach((veh) => {
        nbaiLoc.location.push(
          `${veh.location.latitude},${veh.location.longitude}`
        );
        nbaiVeh.push({
          id: veh.id,
          description: `${veh.serial} - ${veh.name}`,
          time_window: [
            Date.parse(shiftStart) / 1000,
            Date.parse(shiftEnd) / 1000,
          ],
          end_index: locIndex,
          start_index: locIndex++,
          max_tasks: parseInt(maxTasks) > 0 ? parseInt(maxTasks) : 1,
        });
      });

      combinedData.addresses.forEach((addr) => {
        nbaiLoc.location.push(`${addr.latitude},${addr.longitude}`);
        nbaiJobs.push({
          id: addr.id,
          location_index: locIndex++,
          description: `${addr.name} - ${addr.formattedAddress}`,
          service: parseInt(serviceTime),
          metadata: {
            address: addr.formattedAddress,
            customer_name: addr.customerName,
            name: addr.name,
            notes: addr.notes,
          },
        });
      });

      return {
        vehicles: nbaiVeh,
        locations: nbaiLoc,
        jobs: nbaiJobs,
        options: {},
      };
    },
  },
  Geotab: {
    endpoints: {
      vehicles:
        "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://my.geotab.com/apiv1",
      addresses:
        "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/addresses",
      vehicleLocations:
        "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/fleet/vehicles/locations",
      tags: "https://protected-ocean-69781-67106a01ee3b.herokuapp.com/https://api.samsara.com/tags",
    },
    getHeaders: (token) => ({
      Authorization: `Bearer ${token}`,
    }),
    buildAddressUrl: (base, tagId) => {
      return tagId ? `${base}?tagIds=${tagId}` : base;
    },
    getVehicleLocationParam: (vehicleId) => `?vehicleId=${vehicleId}`,
    getVehicleLocation: (response, vehicleId) => {
      const locationData = response.data.find((loc) => loc.id === vehicleId);
      return locationData ? locationData.location : null;
    },
    getVehicles: (response) => response.data,
    processCombinedData: (combinedData, shiftStart, shiftEnd) => {
      const nbaiVeh = [];
      const nbaiJobs = [];
      const nbaiLoc = { id: 1, location: [] };
      let locIndex = 0;
      const serviceTime = document.getElementById("serviceTime").value;
      const maxTasks = document.getElementById("maxTasks").value;

      combinedData.vehicles.forEach((veh) => {
        nbaiLoc.location.push(
          `${veh.location.latitude},${veh.location.longitude}`
        );
        nbaiVeh.push({
          id: veh.id,
          description: `${veh.serial} - ${veh.name}`,
          time_window: [
            Date.parse(shiftStart) / 1000,
            Date.parse(shiftEnd) / 1000,
          ],
          end_index: locIndex,
          start_index: locIndex++,
          max_tasks: parseInt(maxTasks) > 0 ? parseInt(maxTasks) : 1,
        });
      });

      combinedData.addresses.forEach((addr) => {
        nbaiLoc.location.push(`${addr.latitude},${addr.longitude}`);
        nbaiJobs.push({
          id: addr.id,
          location_index: locIndex++,
          description: `${addr.name} - ${addr.formattedAddress}`,
          service: parseInt(serviceTime),
          metadata: {
            address: addr.formattedAddress,
            customer_name: addr.customerName,
            name: addr.name,
            notes: addr.notes,
          },
        });
      });

      return {
        vehicles: nbaiVeh,
        locations: nbaiLoc,
        jobs: nbaiJobs,
        options: {},
      };
    },
  },
  // Other providers remain unchanged
};

function showCustomAlert(message) {
  const alertBox = document.getElementById("customAlert");
  const alertText = document.getElementById("customAlertText");

  // Set the message text
  alertText.textContent = message;

  // Show the alert box
  alertBox.style.display = "flex";

  // Close the alert when clicking the OK button
  document.getElementById("customAlertClose").onclick = () => {
    alertBox.style.display = "none";
  };
}

document
  .getElementById("toggleVisibility")
  .addEventListener("click", function () {
    const tokenInput = document.getElementById("providerToken");
    const toggleButton = this;

    // Toggle the input type
    if (tokenInput.type === "password") {
      tokenInput.type = "text";
      toggleButton.textContent = "Hide"; // Change button text
    } else {
      tokenInput.type = "password";
      toggleButton.textContent = "Show"; // Change button text
    }
  });

document.addEventListener("DOMContentLoaded", async () => {
  const providerSelect = document.getElementById("provider-select");
  const tokenInput = document.getElementById("providerToken");
  const geotabCredentials = document.getElementById("geotab-credentials");
  const geotabDatabase = document.getElementById("geotab-database");
  const geotabUsername = document.getElementById("geotab-username");
  const geotabPassword = document.getElementById("geotab-password");
  const tokenLabel = document.getElementById("providerTokenLabel");
  const tagsContainer = document.getElementById("tags-container");
  const tagsDropdown = document.getElementById("tags-dropdown");
  const geotabStorageKey = "geotab_credentials";

  const saveGeotabCredentials = () => {
    const credentials = {
      database: geotabDatabase.value,
      userName: geotabUsername.value,
      password: geotabPassword.value,
    };
    localStorage.setItem(geotabStorageKey, JSON.stringify(credentials));
  };

  const loadGeotabCredentials = () => {
    const credentials = JSON.parse(
      localStorage.getItem(geotabStorageKey) || "{}"
    );
    geotabDatabase.value = credentials.database || "";
    geotabUsername.value = credentials.userName || "";
    geotabPassword.value = credentials.password || "";
  };

  // Function to authenticate with Geotab
  const authenticateGeotab = async () => {
    const tokenInput = document.getElementById("providerToken");
    const url = "https://my.geotab.com/apiv1";
    const body = {
      method: "Authenticate",
      params: {
        database: geotabDatabase.value,
        userName: geotabUsername.value,
        password: geotabPassword.value,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to authenticate with Geotab");
      }

      const data = await response.json();
      const sessionId = data.result.credentials.sessionId;
      tokenInput.value = sessionId;

      return sessionId;
    } catch (error) {
      console.error("Error authenticating with Geotab:", error);
      alert(
        "Failed to authenticate with Geotab. Please check your credentials."
      );
      return null;
    }
  };


  const fetchTags = async (token) => {
    const headers = providers.Samsara.getHeaders(token);

    try {
      const response = await fetch(providers.Samsara.endpoints.tags, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const data = await response.json();

      tagsDropdown.innerHTML = '<option value="">-- Select a Tag --</option>';
      data.data.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag.id;
        option.textContent = tag.name;
        tagsDropdown.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching tags:", error);
      alert("Failed to load tags. Please check your token and try again.");
    }
  };

  function updateTokenForProvider(provider) {
    const storageKey = `${provider}_token`;
    tokenLabel.textContent = `${provider} ${provider==='Geotab'?'SessionId':'Token'}`;
    const cachedToken = localStorage.getItem(storageKey);
    tokenInput.value = cachedToken || "";
  }

  providerSelect.addEventListener("change", async () => {
    const selectedProvider = providerSelect.value;
    updateTokenForProvider(selectedProvider);

    if (selectedProvider === "Samsara") {
      tagsContainer.style.display = "block";
      const token = tokenInput.value;

      if (token) {
        await fetchTags(token);
      }
    } else if (selectedProvider === "Geotab") {
      tagsContainer.style.display = "none";
      geotabCredentials.style.display = "block";
      loadGeotabCredentials();
    } else {
      geotabCredentials.style.display = "none";
      tagsContainer.style.display = "none";
    }
  });

  tokenInput.addEventListener("input", () => {
    const selectedProvider = providerSelect.value;
    const storageKey = `${selectedProvider}_token`;
    localStorage.setItem(storageKey, tokenInput.value);
  });

  document
    .getElementById("saveClipboardButton")
    .addEventListener("click", async () => {
      const selectedProvider = providerSelect.value;
      const providerConfig = providers[selectedProvider];

      if (!providerConfig) {
        console.log("Invalid provider selected.");
        return;
      }

      if (selectedProvider === "Geotab") {
        saveGeotabCredentials();
        const sessionId = await authenticateGeotab();
  
        if (sessionId) {
          console.log("Geotab authenticated. Session ID saved.");
          // Save or use sessionId as needed
        }
      }

      const storageKey = `${selectedProvider}_token`;

      // Save the current token value in localStorage
      localStorage.setItem(storageKey, tokenInput.value);
      const headers = selectedProvider==='Samsara'?providerConfig.getHeaders(tokenInput.value):{};
      const selectedTag = tagsDropdown.value;
      const params = selectedTag ? { tagIds: selectedTag } : {};
      try {
        // Fetch vehicles and addresses in parallel
        const [vehiclesResponse, addressesResponse] = await Promise.all([
          fetchData(providerConfig.endpoints.vehicles, headers, {}),
          fetchData(providerConfig.endpoints.addresses, headers, params),
        ]);

        // Extract vehicles using provider-specific logic
        const vehicles = providerConfig.getVehicles(vehiclesResponse);
        // Fetch location data for each vehicle
        const vehiclePromises = vehicles.map((vehicle) => {
          const vehicleLocationParam = providerConfig.getVehicleLocationParam(
            vehicle.id
          );
          return fetchData(
            `${providerConfig.endpoints.vehicleLocations}${vehicleLocationParam}`,
            headers,
            {}
          ).then((locationResponse) => {
            vehicle.location = providerConfig.getVehicleLocation(
              locationResponse,
              vehicle.id
            );
            return vehicle; // Explicitly return the vehicle with updated location
          });
        });

        const updatedVehicles = await Promise.all(vehiclePromises);

        // Combine data
        const combinedData = {
          vehicles: updatedVehicles,
          addresses: addressesResponse.data,
        };

        // Process the combined data using provider-specific logic
        const processedData = providerConfig.processCombinedData(
          combinedData,
          shiftStartInput.value,
          shiftEndInput.value
        );

        // Copy the processed data to the clipboard
        const clipboardData = JSON.stringify(processedData, null, 2);
        await navigator.clipboard.writeText(clipboardData);
        showCustomAlert(
          `Formatted ${selectedProvider} data translated and copied to clipboard. Paste it in the input panel of the Route Planner tool.`
        );
      } catch (error) {
        console.error("Error processing data:", error);
        alert("Failed to fetch or process data. Please try again.");
      }
    });

  const shiftStartInput = document.getElementById("shiftStart");
  const shiftEndInput = document.getElementById("shiftEnd");

  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    8,
    0,
    0
  );

  const shiftEnd = new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000);

  const formatDateTime = (date) => {
    const pad = (num) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  shiftStartInput.value = formatDateTime(tomorrow);
  shiftEndInput.value = formatDateTime(shiftEnd);

  const fetchData = (url, headers, params) => {
    const urlWithParams = new URL(url);
    Object.keys(params).forEach((key) =>
      urlWithParams.searchParams.append(key, params[key])
    );
    return fetch(urlWithParams, {
      method: "GET",
      headers: headers,
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Network response was not ok for URL: ${url}`);
      }
      return response.json();
    });
  };

  updateTokenForProvider(providerSelect.value);

  if (providerSelect.value === "Samsara" && tokenInput.value) {
    await fetchTags(tokenInput.value);
    tagsContainer.style.display = "block";
  } else {
    tagsContainer.style.display = "none";
  }
  if (providerSelect.value === "Geotab") {
    geotabCredentials.style.display = "block";
    loadGeotabCredentials();
  } else {
    geotabCredentials.style.display = "none";
  }
});
