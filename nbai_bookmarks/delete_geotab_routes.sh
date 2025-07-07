#!/bin/bash

# Set environment variables for Geotab credentials (ensure these are set before running)
GEOTAB_DATABASE="nextbillion_ai"
GEOTAB_USERNAME="${GEOTAB_USERNAME:?Please set GEOTAB_USERNAME}"
GEOTAB_PASSWORD="${GEOTAB_PASSWORD:?Please set GEOTAB_PASSWORD}"
GEOTAB_API_URL="https://my.geotab.com/apiv1"

# Set default dates
DEFAULT_FROM_DATE="2025-03-01T00:00:00.000Z"
DEFAULT_TO_DATE="2025-07-01T00:00:00.000Z"

# Prompt user for date range with defaults
read -p "Enter fromDate (YYYY-MM-DDThh:mm:ss.000Z) [${DEFAULT_FROM_DATE}]: " FROM_DATE
read -p "Enter toDate (YYYY-MM-DDThh:mm:ss.000Z) [${DEFAULT_TO_DATE}]: " TO_DATE

# Use default values if no input provided
FROM_DATE=${FROM_DATE:-$DEFAULT_FROM_DATE}
TO_DATE=${TO_DATE:-$DEFAULT_TO_DATE}

# Validate input format using regex
DATE_REGEX='^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.000Z$'
if ! [[ $FROM_DATE =~ $DATE_REGEX ]]; then
  echo "Invalid fromDate format. Expected YYYY-MM-DDThh:mm:ss.000Z"
  exit 1
fi
if ! [[ $TO_DATE =~ $DATE_REGEX ]]; then
  echo "Invalid toDate format. Expected YYYY-MM-DDThh:mm:ss.000Z"
  exit 1
fi

# Authenticate to obtain sessionId
SESSION_ID=$(curl -s -X POST "$GEOTAB_API_URL"   -H "Content-Type: application/json"   --data-raw '{
    "method": "Authenticate",
    "params": {
      "database": "'"$GEOTAB_DATABASE"'",
      "userName": "'"$GEOTAB_USERNAME"'",
      "password": "'"$GEOTAB_PASSWORD"'"
    }
  }' | jq -r '.result.credentials.sessionId')

# Check if authentication was successful
if [[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]]; then
  echo "Authentication failed. Check credentials."
  exit 1
fi

echo "Authenticated successfully. Session ID: $SESSION_ID"

# Fetch routes from Geotab API using user-provided date range
ROUTE_IDS=$(curl -s "$GEOTAB_API_URL"   -H "Content-Type: application/json"   --data-raw '{
    "method": "ExecuteMultiCall",
    "params": {
      "calls": [
        {
          "method": "Get",
          "params": {
            "typeName": "Route",
            "search": {
              "routeType": "Plan",
              "includeRouteStatus": false,
              "fromDate": "'"$FROM_DATE"'", 
              "toDate": "'"$TO_DATE"'"
            },
            "resultsLimit": 500
          }
        }
      ],
      "credentials": {
        "database": "'"$GEOTAB_DATABASE"'",
        "userName": "'"$GEOTAB_USERNAME"'",
        "sessionId": "'"$SESSION_ID"'"
      }
    }
  }' | jq -r '.result[0][] | .id')

# Check if routes were retrieved
if [[ -z "$ROUTE_IDS" ]]; then
  echo "No routes found in the specified date range."
  exit 0
fi

# Loop through each route ID and delete it
for route_id in $ROUTE_IDS; do
  echo "Deleting route: $route_id"
  curl --location "$GEOTAB_API_URL"     -H "Content-Type: application/json"     --data-raw "{
      \"method\": \"Remove\",
      \"params\": {
        \"typeName\": \"Route\",
        \"entity\": {
          \"id\": \"$route_id\"
        },
        \"credentials\": {
          \"database\": \"$GEOTAB_DATABASE\",
          \"userName\": \"$GEOTAB_USERNAME\",
          \"sessionId\": \"$SESSION_ID\"
        }
      }
    }"
done

echo "Route deletion process completed."