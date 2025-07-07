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
          start_index: locIndex++,
        });
      });

      combinedData.addresses.forEach((addr) => {
        nbaiLoc.location.push(`${addr.latitude},${addr.longitude}`);
        nbaiJobs.push({
          id: addr.id,
          location_index: locIndex++,
          description: `${addr.name} - ${addr.formattedAddress}`,
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

document.addEventListener("DOMContentLoaded", async () => {
  const providerSelect = document.getElementById("provider-select");
  const tokenInput = document.getElementById("providerToken");
  const tokenLabel = document.getElementById("providerTokenLabel");
  const toggleVisibility = document.getElementById("toggleVisibility");
  const tagsContainer = document.getElementById("tags-container");
  const tagsDropdown = document.getElementById("tags-dropdown");
  const saveClipboardButton = document.getElementById("sample-button");

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
    tokenLabel.textContent = `${provider} Token`;
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
    } else {
      tagsContainer.style.display = "none";
    }
  });

  tokenInput.addEventListener("input", () => {
    const selectedProvider = providerSelect.value;
    const storageKey = `${selectedProvider}_token`;
    localStorage.setItem(storageKey, tokenInput.value);
  });

  saveClipboardButton.addEventListener("click", () => {
    const selectedProvider = providerSelect.value;

    if (selectedProvider === "Samsara") {
      const selectedTag = tagsDropdown.value;
      if (!selectedTag) {
        alert("Please select a tag.");
        return;
      }
      console.log(`Selected Tag ID: ${selectedTag}`);
    }
    alert("Data copied to clipboard!");
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

  updateTokenForProvider(providerSelect.value);

  if (providerSelect.value === "Samsara" && tokenInput.value) {
    await fetchTags(tokenInput.value);
    tagsContainer.style.display = "block";
  } else {
    tagsContainer.style.display = "none";
  }
});