# Mobility Route Analysis & Reporting System

[![Tests](https://github.com/mbsoft/nbai_examples/workflows/Route%20Analysis%20Tests/badge.svg)](https://github.com/mbsoft/nbai_examples/actions/workflows/test.yml)
[![Node.js CI](https://img.shields.io/badge/node-16.x%20%7C%2018.x%20%7C%2020.x-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](https://github.com/mbsoft/nbai_examples/actions/workflows/test.yml)
[![npm version](https://img.shields.io/badge/npm-latest-blue.svg)](https://www.npmjs.com/)
[![Maintenance](https://img.shields.io/badge/maintained-yes-green.svg)](https://github.com/mbsoft/nbai_examples/graphs/commit-activity)

A comprehensive Node.js application for analyzing route optimization solutions and generating detailed reports with key performance indicators (KPIs) for transportation fleets.

## Features

### Core Analysis
- **Route Performance Metrics**: Total miles, revenue miles, empty miles, and load percentages
- **Passenger Analytics**: Count of ambulatory and wheelchair passengers transported per route
- **Efficiency Metrics**: Passengers per hour calculations for transportation efficiency
- **Timing Analysis**: Route start and end times in 24-hour format
- **Vehicle Utilization**: Load percentage based on vehicle capacity from JSON data

### Output Formats
- **Console Output**: Detailed analysis with individual route breakdowns
- **Email-Ready Table**: Formatted table suitable for copy-paste into email communications
- **PDF Report**: Professional multi-page report with summary tables and detailed route data
- **JSON Export**: Complete analysis data for further processing

### Data Sources
- **Route Solution JSON**: Contains optimized route data with steps, distances, and passenger loads
- **Vehicle Capacity JSON**: Defines vehicle types and passenger capacity limits

## Installation

1. Navigate to the route_analysis directory:
```bash
cd route_analysis
```

2. Install dependencies:
```bash
npm install
```

## Usage

### Required Parameters
The script requires you to specify the input files as parameters. There are no default files.

### Using the Test Files
```bash
node mobility_route_report.js test_mobility_solution.json test_vehicles.json
```

### Custom Input Files
```bash
node mobility_route_report.js [route_solution.json] [vehicles.json]
```

### Help
```bash
node mobility_route_report.js --help
```

### Examples
```bash
# Run with test files
node mobility_route_report.js test_mobility_solution.json test_vehicles.json

# Run with custom files in parent directory
node mobility_route_report.js ../my_routes.json ../my_vehicles.json

# Run with absolute paths
node mobility_route_report.js /path/to/routes.json /path/to/vehicles.json
```

## Input File Formats

### Route Solution JSON
Expected structure:
```json
{
  "routes": [
    {
      "vehicle": "vehicle_id",
      "duration": 12345,
      "steps": [
        {
          "type": "start|pickup|delivery|end",
          "arrival": 1712489481,
          "distance": 0,
          "load": [ambulatory_count, wheelchair_count],
          "id": "passenger_id"
        }
      ]
    }
  ],
  "unassigned": [...]
}
```

### Vehicle Capacity JSON
Expected format:
```json
[
  {
    "vehicle_id": 2638,
    "start_location_latitude": 26.68488,
    "start_location_longitude": -80.17861,
    "end_location_latitude": 26.68488,
    "end_location_longitude": -80.17861,
    "ambulatory_slots": 3,
    "wc_slots": 1,
    "shift_start": "4/7/2024 5:30:00 AM",
    "shift_end": "4/7/2024 8:30:00 PM"
  },
  ...
]
```

## Output Files

### Console Output
- Individual route analysis with all KPIs
- Overall summary statistics
- Email-ready formatted table

### Generated Files
- `route_analysis_results.json` - Complete analysis data
- `route_analysis_report.pdf` - Professional PDF report

## Key Performance Indicators

### Route-Level Metrics
- **Total Miles**: Complete route distance in miles
- **Revenue Miles**: Distance traveled with passengers onboard
- **Empty Miles**: Distance traveled without passengers
- **Load Percentage**: Average vehicle utilization across the route
- **Passengers per Hour**: Transportation efficiency metric
- **Start/End Times**: Route timing in 24-hour format

### Fleet-Level Metrics
- **Total Routes**: Number of assigned routes
- **Unassigned Trips**: Count of trips that couldn't be assigned
- **Overall Efficiency**: Fleet-wide passengers per hour
- **Average Utilization**: Mean load percentage across all routes

## PDF Report Contents

1. **Executive Summary**: Key fleet performance metrics
2. **Route Details**: Comprehensive table of all routes with KPIs
3. **Vehicle Capacity Summary**: Fleet composition and capacity data

## Dependencies

- **pdfkit**: PDF generation library
- **Node.js**: Runtime environment (v14+ recommended)

## Testing

Run the test suite:
```bash
npm test
```

Tests are located in the `test/` directory and cover:
- Data parsing functionality
- KPI calculations
- PDF generation
- Error handling

## Error Handling

The application handles common error scenarios:
- Missing or malformed input files
- Invalid JSON formats
- Missing vehicle capacity data
- File permission issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 