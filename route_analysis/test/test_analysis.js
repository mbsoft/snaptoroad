// Tests for mobility route analysis functions

import { 
    calculateRouteKPIs, 
    analyzeRoutes, 
    formatDuration, 
    metersToMiles, 
    parseVehicleCapacities,
    formatTime,
    parseArgs
} from '../mobility_route_report.js';

import { 
    sampleRouteData, 
    sampleVehicleData, 
    sampleCSVContent,
    expectedRoute1KPIs,
    expectedRoute2KPIs
} from './test_data.js';

import { 
    assertEqual, 
    assertApproxEqual, 
    assertObjectEqual,
    createTempFile,
    cleanupTempFiles,
    captureConsoleOutput,
    assertFileExists,
    assertFileContains,
    runTests
} from './test_utils.js';

// Test utility functions
function testFormatDuration() {
    assertEqual(formatDuration(3661), '1:01', 'Should format 3661 seconds as 1:01');
    assertEqual(formatDuration(7200), '2:00', 'Should format 7200 seconds as 2:00');
    assertEqual(formatDuration(0), '0:00', 'Should format 0 seconds as 0:00');
}

function testMetersToMiles() {
    assertApproxEqual(metersToMiles(1609.34), 1, 0.01, 'Should convert 1609.34 meters to 1 mile');
    assertApproxEqual(metersToMiles(1000), 0.621, 0.01, 'Should convert 1000 meters to ~0.621 miles');
    assertEqual(metersToMiles(0), 0, 'Should convert 0 meters to 0 miles');
}

function testFormatTime() {
    // Test with a known timestamp (7:30 AM)
    const timestamp = 1712489400;
    assertEqual(formatTime(timestamp), '07:30', 'Should format timestamp to 24-hour time');
    
    // Test with 2:30 PM (7:30 AM + 7 hours = 2:30 PM)
    const timestamp2 = 1712489400 + (7 * 3600); // 7:30 AM + 7 hours = 2:30 PM
    assertEqual(formatTime(timestamp2), '14:30', 'Should format PM time correctly');
}

function testParseVehicleCapacities() {
    const csvPath = createTempFile(sampleCSVContent, 'test_vehicles.csv');
    
    try {
        const capacities = parseVehicleCapacities(csvPath);
        
        assertObjectEqual(capacities, sampleVehicleData, 'Should parse CSV correctly');
        assertEqual(Object.keys(capacities).length, 2, 'Should parse 2 vehicles');
        
        // Test individual vehicle data
        assertEqual(capacities['2638'].ambulatorySlots, 3, 'Should parse ambulatory slots');
        assertEqual(capacities['2638'].wcSlots, 1, 'Should parse WC slots');
        assertEqual(capacities['2638'].totalCapacity, 4, 'Should calculate total capacity');
    } finally {
        cleanupTempFiles();
    }
}

function testParseArgs() {
    // Test default arguments
    const originalArgv = process.argv;
    process.argv = ['node', 'mobility_route_report.js'];
    
    try {
        const args = parseArgs();
        assertEqual(args.jsonFile, './test_mobility_solution.json', 'Should use default JSON file');
        assertEqual(args.csvFile, './test_vehicles.csv', 'Should use default CSV file');
    } finally {
        process.argv = originalArgv;
    }
    
    // Test custom arguments
    process.argv = ['node', 'mobility_route_report.js', 'custom.json', 'custom.csv'];
    
    try {
        const args = parseArgs();
        assertEqual(args.jsonFile, 'custom.json', 'Should use custom JSON file');
        assertEqual(args.csvFile, 'custom.csv', 'Should use custom CSV file');
    } finally {
        process.argv = originalArgv;
    }
}

// Test KPI calculations
function testCalculateRouteKPIs() {
    const route = sampleRouteData.routes[0];
    const vehicleCapacities = sampleVehicleData;
    
    const kpis = calculateRouteKPIs(route, 0, vehicleCapacities);
    
    // Test basic properties
    assertEqual(kpis.routeDescription, expectedRoute1KPIs.routeDescription, 'Route description');
    assertEqual(kpis.startTime, expectedRoute1KPIs.startTime, 'Start time');
    assertEqual(kpis.endTime, expectedRoute1KPIs.endTime, 'End time');
    
    // Test calculated values (with tolerance for floating point)
    assertApproxEqual(kpis.totalMiles, expectedRoute1KPIs.totalMiles, 0.1, 'Total miles');
    assertApproxEqual(kpis.revenueMiles, expectedRoute1KPIs.revenueMiles, 0.1, 'Revenue miles');
    assertApproxEqual(kpis.emptyMiles, expectedRoute1KPIs.emptyMiles, 0.1, 'Empty miles');
    assertApproxEqual(kpis.loadPercentage, 10, 1, 'Load percentage');
    
    // Test passenger counts
    assertEqual(kpis.ambulatoryPassengers, expectedRoute1KPIs.ambulatoryPassengers, 'Ambulatory passengers');
    assertEqual(kpis.wcPassengers, expectedRoute1KPIs.wcPassengers, 'WC passengers');
    assertEqual(kpis.totalPassengers, expectedRoute1KPIs.totalPassengers, 'Total passengers');
    
    // Test efficiency metrics
    assertApproxEqual(kpis.passengersPerHour, expectedRoute1KPIs.passengersPerHour, 0.1, 'Passengers per hour');
}

function testAnalyzeRoutes() {
    const analysis = analyzeRoutes(sampleRouteData, sampleVehicleData);
    
    // Test overall summary
    assertEqual(analysis.overallSummary.totalRoutes, 2, 'Total routes count');
    assertEqual(analysis.overallSummary.unassignedTrips, 1, 'Unassigned trips count');
    assertEqual(analysis.overallSummary.totalAmbulatoryPassengers, 3, 'Total ambulatory passengers');
    assertEqual(analysis.overallSummary.totalWcPassengers, 1, 'Total WC passengers');
    assertEqual(analysis.overallSummary.totalPassengers, 4, 'Total passengers');
    
    // Test individual route results
    assertEqual(analysis.results.length, 2, 'Should have 2 route results');
    
    // Test first route
    const route1 = analysis.results[0];
    assertEqual(route1.routeDescription, expectedRoute1KPIs.routeDescription, 'Route 1 description');
    assertApproxEqual(route1.totalMiles, expectedRoute1KPIs.totalMiles, 0.1, 'Route 1 total miles');
    
    // Test second route
    const route2 = analysis.results[1];
    assertEqual(route2.routeDescription, expectedRoute2KPIs.routeDescription, 'Route 2 description');
    assertApproxEqual(route2.totalMiles, expectedRoute2KPIs.totalMiles, 0.1, 'Route 2 total miles');
}

// Test edge cases
function testEmptyRouteData() {
    const emptyData = {
        routes: [],
        unassigned: []
    };
    
    const analysis = analyzeRoutes(emptyData, {});
    
    assertEqual(analysis.overallSummary.totalRoutes, 0, 'Should handle empty routes');
    assertEqual(analysis.overallSummary.unassignedTrips, 0, 'Should handle empty unassigned');
    assertEqual(analysis.results.length, 0, 'Should have no route results');
}

function testMissingVehicleCapacity() {
    const route = sampleRouteData.routes[0];
    const emptyCapacities = {};
    
    const kpis = calculateRouteKPIs(route, 0, emptyCapacities);
    
    // Should use default capacity of 1
    assertEqual(kpis.vehicleCapacity, 1, 'Should use default capacity when vehicle not found');
}

function testRouteWithNoPassengers() {
    const noPassengerRoute = {
        vehicle: "2638",
        duration: 3600,
        steps: [
            {
                type: "start",
                arrival: 1712489400,
                distance: 0,
                load: [0, 0]
            },
            {
                type: "end",
                arrival: 1712493000,
                distance: 10000,
                load: [0, 0]
            }
        ]
    };
    
    const kpis = calculateRouteKPIs(noPassengerRoute, 0, sampleVehicleData);
    
    assertEqual(kpis.ambulatoryPassengers, 0, 'Should have 0 ambulatory passengers');
    assertEqual(kpis.wcPassengers, 0, 'Should have 0 WC passengers');
    assertEqual(kpis.totalPassengers, 0, 'Should have 0 total passengers');
    assertEqual(kpis.passengersPerHour, 0, 'Should have 0 passengers per hour');
}

// Run all tests
export function runAllTests() {
    const tests = {
        'formatDuration': testFormatDuration,
        'metersToMiles': testMetersToMiles,
        'formatTime': testFormatTime,
        'parseVehicleCapacities': testParseVehicleCapacities,
        'parseArgs': testParseArgs,
        'calculateRouteKPIs': testCalculateRouteKPIs,
        'analyzeRoutes': testAnalyzeRoutes,
        'emptyRouteData': testEmptyRouteData,
        'missingVehicleCapacity': testMissingVehicleCapacity,
        'routeWithNoPassengers': testRouteWithNoPassengers
    };
    
    runTests(tests);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests();
} 