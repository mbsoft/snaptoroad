import fs from 'fs';
import { generatePDFReport } from './pdf_generator.js';

// Constants
const METERS_TO_MILES = 0.000621371; // Conversion factor from meters to miles

// Helper function to format duration in h:mm format
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to convert Unix timestamp to readable time
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000); // Convert to milliseconds
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function to convert meters to miles
function metersToMiles(meters) {
    return meters * METERS_TO_MILES;
}

// Helper function to pad strings for table formatting
function pad(str, len) {
    str = String(str);
    return str + ' '.repeat(Math.max(0, len - str.length));
}

// Parse vehicle capacities from JSON file
function parseVehicleCapacitiesFromJSON(jsonFilePath) {
    const vehicles = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    const vehicleCapacities = {};
    for (const v of vehicles) {
        const vehicleId = String(v.vehicle_id);
        const ambulatorySlots = parseInt(v.ambulatory_slots ?? v.ambulatorySlots);
        const wcSlots = parseInt(v.wc_slots ?? v.wcSlots);
        const totalCapacity = ambulatorySlots + wcSlots;
        vehicleCapacities[vehicleId] = {
            ambulatorySlots,
            wcSlots,
            totalCapacity
        };
    }
    return vehicleCapacities;
}

// Output results in a plain text table format for email
function printEmailTable(results, overallSummary) {
    // Determine column widths
    const headers = [
        'Route', 'Start Time', 'End Time', 'Total Miles', 'Revenue Miles', 'Empty Miles', 'Load %', 'Passengers', 'Pax/Hr', 'Duration'
    ];
    const colWidths = [
        30, // Route description
        10, // Start Time
        10, // End Time
        12, // Total Miles
        14, // Revenue Miles
        12, // Empty Miles
        8,  // Load %
        12, // Passengers
        8,  // Passengers per Hour
        8   // Duration
    ];
    
    // Header
    let table = headers.map((h, i) => pad(h, colWidths[i])).join(' | ') + '\n';
    table += colWidths.map(w => '-'.repeat(w)).join('-|-') + '\n';
    
    // Rows
    for (const row of results) {
        const passengerInfo = `${row.ambulatoryPassengers}A/${row.wcPassengers}W`;
        table += [
            pad(row.routeDescription, colWidths[0]),
            pad(row.startTime, colWidths[1]),
            pad(row.endTime, colWidths[2]),
            pad(row.totalMiles, colWidths[3]),
            pad(row.revenueMiles, colWidths[4]),
            pad(row.emptyMiles, colWidths[5]),
            pad(row.loadPercentage + '%', colWidths[6]),
            pad(passengerInfo, colWidths[7]),
            pad(row.passengersPerHour, colWidths[8]),
            pad(row.routeDuration, colWidths[9])
        ].join(' | ') + '\n';
    }
    
    // Summary
    table += '\n';
    table += 'OVERALL SUMMARY' + '\n';
    table += `Total Routes: ${overallSummary.totalRoutes}\n`;
    table += `Unassigned Trips: ${overallSummary.unassignedTrips}\n`;
    table += `Total Miles: ${Math.round(overallSummary.totalMiles * 100) / 100}\n`;
    table += `Total Revenue Miles: ${Math.round(overallSummary.totalRevenueMiles * 100) / 100}\n`;
    table += `Total Empty Miles: ${Math.round(overallSummary.totalEmptyMiles * 100) / 100}\n`;
    table += `Average Load %: ${Math.round(overallSummary.averageLoadPercentage * 100) / 100}%\n`;
    table += `Total Duration: ${formatDuration(overallSummary.totalDuration)}\n`;
    table += `Total Ambulatory Passengers: ${overallSummary.totalAmbulatoryPassengers}\n`;
    table += `Total WC Passengers: ${overallSummary.totalWcPassengers}\n`;
    table += `Total Passengers: ${overallSummary.totalPassengers}\n`;
    table += `Overall Passengers per Hour: ${Math.round(overallSummary.passengersPerHour * 100) / 100}\n`;
    table += `Average Miles per Route: ${Math.round((overallSummary.totalMiles / overallSummary.totalRoutes) * 100) / 100}\n`;
    table += `Average Revenue Miles per Route: ${Math.round((overallSummary.totalRevenueMiles / overallSummary.totalRoutes) * 100) / 100}\n`;
    table += `Average Empty Miles per Route: ${Math.round((overallSummary.totalEmptyMiles / overallSummary.totalRoutes) * 100) / 100}\n`;
    table += `Average Passengers per Route: ${Math.round((overallSummary.totalPassengers / overallSummary.totalRoutes) * 100) / 100}\n`;
    
    console.log('\n=== COPY/PASTE FOR EMAIL ===\n');
    console.log(table);
}

// Calculate KPIs for a single route
function calculateRouteKPIs(route, routeIndex, vehicleCapacities) {
    const steps = route.steps;
    let totalMiles = 0;
    let revenueMiles = 0;
    let emptyMiles = 0;
    let previousDistance = 0;
    let previousLoad = [0, 0]; // [ambulatory, wheelchair]
    let totalLoadMiles = 0; // For calculating average load percentage
    let ambulatoryPassengers = 0; // Count of ambulatory passengers transported
    let wcPassengers = 0; // Count of wheelchair passengers transported
    let passengerTracking = new Set(); // Track unique passengers to avoid double counting
    
    // Get vehicle capacity
    const vehicleId = route.vehicle;
    const vehicleCapacity = vehicleCapacities[vehicleId] || { totalCapacity: 1 }; // Default to 1 to avoid division by zero
    
    // Extract start and end times
    const startStep = steps.find(step => step.type === 'start');
    const endStep = steps.find(step => step.type === 'end');
    const startTime = startStep ? formatTime(startStep.arrival) : 'Unknown';
    const endTime = endStep ? formatTime(endStep.arrival) : 'Unknown';
    
    // Process each step
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const currentDistance = step.distance;
        const currentLoad = step.load;
        
        // Calculate distance for this segment
        const segmentDistance = currentDistance - previousDistance;
        const segmentMiles = metersToMiles(segmentDistance);
        
        // Add to total miles
        totalMiles = metersToMiles(currentDistance);
        
        // Calculate revenue miles and empty miles for this segment
        const totalPassengers = previousLoad[0] + previousLoad[1]; // Use load from previous step
        
        if (totalPassengers > 0) {
            revenueMiles += segmentMiles * totalPassengers;
        } else {
            emptyMiles += segmentMiles;
        }
        
        // Calculate load percentage for this segment
        const loadPercentage = (totalPassengers / vehicleCapacity.totalCapacity) * 100;
        totalLoadMiles += segmentMiles * loadPercentage;
        
        // Track passenger counts for delivery steps
        if (step.type === 'delivery' && step.id) {
            const passengerId = step.id;
            if (!passengerTracking.has(passengerId)) {
                passengerTracking.add(passengerId);
                
                // Determine passenger type based on the load pattern
                // This is a simplified approach - in a real scenario you might have passenger type data
                // For now, we'll estimate based on the load at pickup vs delivery
                const pickupStep = steps.find(s => s.id === passengerId && s.type === 'pickup');
                if (pickupStep) {
                    const pickupLoad = pickupStep.load;
                    const deliveryLoad = step.load;
                    
                    // Calculate the difference to determine passenger type
                    const ambulatoryDiff = pickupLoad[0] - deliveryLoad[0];
                    const wcDiff = pickupLoad[1] - deliveryLoad[1];
                    
                    if (ambulatoryDiff > 0) {
                        ambulatoryPassengers += ambulatoryDiff;
                    }
                    if (wcDiff > 0) {
                        wcPassengers += wcDiff;
                    }
                }
            }
        }
        
        // Update for next iteration
        previousDistance = currentDistance;
        previousLoad = currentLoad;
    }
    
    // Calculate average load percentage for the route
    const averageLoadPercentage = totalMiles > 0 ? totalLoadMiles / totalMiles : 0;
    
    // Calculate passengers per hour
    const totalPassengers = ambulatoryPassengers + wcPassengers;
    const routeHours = route.duration / 3600; // Convert seconds to hours
    const passengersPerHour = routeHours > 0 ? totalPassengers / routeHours : 0;
    
    // Create route description
    const routeDescription = `Route ${routeIndex + 1} - Vehicle ${route.vehicle || 'Unknown'}`;
    
    return {
        routeDescription,
        startTime,
        endTime,
        totalMiles: Math.round(totalMiles * 100) / 100, // Round to 2 decimal places
        revenueMiles: Math.round(revenueMiles * 100) / 100,
        emptyMiles: Math.round(emptyMiles * 100) / 100,
        loadPercentage: Math.round(averageLoadPercentage * 100) / 100,
        routeDuration: formatDuration(route.duration),
        vehicleCapacity: vehicleCapacity.totalCapacity,
        ambulatoryPassengers,
        wcPassengers,
        totalPassengers,
        passengersPerHour: Math.round(passengersPerHour * 100) / 100
    };
}

// Main analysis function
function analyzeRoutes(data, vehicleCapacities) {
    const routes = data.routes;
    const results = [];
    let overallSummary = {
        totalRoutes: routes.length,
        totalMiles: 0,
        totalRevenueMiles: 0,
        totalEmptyMiles: 0,
        totalLoadMiles: 0,
        totalDuration: 0,
        totalAmbulatoryPassengers: 0,
        totalWcPassengers: 0,
        totalPassengers: 0,
        unassignedTrips: data.unassigned ? data.unassigned.length : 0
    };
    
    console.log('=== ROUTE ANALYSIS RESULTS ===\n');
    
    // Analyze each route
    for (let i = 0; i < routes.length; i++) {
        const routeKPIs = calculateRouteKPIs(routes[i], i, vehicleCapacities);
        results.push(routeKPIs);
        
        // Add to overall summary
        overallSummary.totalMiles += routeKPIs.totalMiles;
        overallSummary.totalRevenueMiles += routeKPIs.revenueMiles;
        overallSummary.totalEmptyMiles += routeKPIs.emptyMiles;
        overallSummary.totalLoadMiles += routeKPIs.totalMiles * routeKPIs.loadPercentage;
        overallSummary.totalDuration += routes[i].duration;
        overallSummary.totalAmbulatoryPassengers += routeKPIs.ambulatoryPassengers;
        overallSummary.totalWcPassengers += routeKPIs.wcPassengers;
        overallSummary.totalPassengers += routeKPIs.totalPassengers;
        
        // Print individual route results
        console.log(`${routeKPIs.routeDescription}`);
        console.log(`  Total Miles: ${routeKPIs.totalMiles}`);
        console.log(`  Revenue Miles: ${routeKPIs.revenueMiles}`);
        console.log(`  Empty Miles: ${routeKPIs.emptyMiles}`);
        console.log(`  Load %: ${routeKPIs.loadPercentage}%`);
        console.log(`  Vehicle Capacity: ${routeKPIs.vehicleCapacity}`);
        console.log(`  Ambulatory Passengers: ${routeKPIs.ambulatoryPassengers}`);
        console.log(`  WC Passengers: ${routeKPIs.wcPassengers}`);
        console.log(`  Total Passengers: ${routeKPIs.totalPassengers}`);
        console.log(`  Passengers per Hour: ${routeKPIs.passengersPerHour}`);
        console.log(`  Duration: ${routeKPIs.routeDuration}`);
        console.log('');
    }
    
    // Calculate average load percentage
    overallSummary.averageLoadPercentage = overallSummary.totalMiles > 0 ? 
        overallSummary.totalLoadMiles / overallSummary.totalMiles : 0;
    
    // Calculate overall passengers per hour
    const totalHours = overallSummary.totalDuration / 3600;
    overallSummary.passengersPerHour = totalHours > 0 ? 
        overallSummary.totalPassengers / totalHours : 0;
    
    // Print overall summary
    console.log('=== OVERALL SUMMARY ===');
    console.log(`Total Routes: ${overallSummary.totalRoutes}`);
    console.log(`Unassigned Trips: ${overallSummary.unassignedTrips}`);
    console.log(`Total Miles: ${Math.round(overallSummary.totalMiles * 100) / 100}`);
    console.log(`Total Revenue Miles: ${Math.round(overallSummary.totalRevenueMiles * 100) / 100}`);
    console.log(`Total Empty Miles: ${Math.round(overallSummary.totalEmptyMiles * 100) / 100}`);
    console.log(`Average Load %: ${Math.round(overallSummary.averageLoadPercentage * 100) / 100}%`);
    console.log(`Total Duration: ${formatDuration(overallSummary.totalDuration)}`);
    console.log(`Total Ambulatory Passengers: ${overallSummary.totalAmbulatoryPassengers}`);
    console.log(`Total WC Passengers: ${overallSummary.totalWcPassengers}`);
    console.log(`Total Passengers: ${overallSummary.totalPassengers}`);
    console.log(`Overall Passengers per Hour: ${Math.round(overallSummary.passengersPerHour * 100) / 100}`);
    console.log(`Average Miles per Route: ${Math.round((overallSummary.totalMiles / overallSummary.totalRoutes) * 100) / 100}`);
    console.log(`Average Revenue Miles per Route: ${Math.round((overallSummary.totalRevenueMiles / overallSummary.totalRoutes) * 100) / 100}`);
    console.log(`Average Empty Miles per Route: ${Math.round((overallSummary.totalEmptyMiles / overallSummary.totalRoutes) * 100) / 100}`);
    console.log(`Average Passengers per Route: ${Math.round((overallSummary.totalPassengers / overallSummary.totalRoutes) * 100) / 100}`);
    
    return { results, overallSummary };
}

// Parse command line arguments for input files
function parseArgs() {
    const args = process.argv.slice(2);
    let jsonFile = './test_mobility_solution.json';
    let vehicleFile = './test_vehicles.json';
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--help' || args[i] === '-h') {
            console.log('Usage: node mobility_route_report.js [route_solution.json] [vehicles.json]');
            console.log('Defaults: ./test_mobility_solution.json ./test_vehicles.json');
            process.exit(0);
        }
        if (i === 0 && args[i].endsWith('.json')) jsonFile = args[i];
        if (i === 1 && args[i].endsWith('.json')) vehicleFile = args[i];
    }
    return { jsonFile, vehicleFile };
}

// Main execution
async function main() {
    try {
        // Parse command line args
        const { jsonFile, vehicleFile } = parseArgs();
        // Read the JSON file
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        // Parse vehicle capacities from JSON
        const vehicleCapacities = parseVehicleCapacitiesFromJSON(vehicleFile);
        console.log(`Loaded capacity data for ${Object.keys(vehicleCapacities).length} vehicles\n`);
        // Perform analysis
        const analysis = analyzeRoutes(data, vehicleCapacities);
        // Print email table
        printEmailTable(analysis.results, analysis.overallSummary);
        // Generate PDF report
        console.log('\n=== GENERATING PDF REPORT ===');
        await generatePDFReport(analysis.results, analysis.overallSummary, vehicleCapacities);
        // Save results to file
        const outputData = {
            timestamp: new Date().toISOString(),
            individualRoutes: analysis.results,
            overallSummary: analysis.overallSummary,
            vehicleCapacities: vehicleCapacities
        };
        fs.writeFileSync('route_analysis_results.json', JSON.stringify(outputData, null, 2));
        console.log('\n=== RESULTS SAVED ===');
        console.log('Detailed results have been saved to: route_analysis_results.json');
        console.log('PDF report has been saved to: route_analysis_report.pdf');
    } catch (error) {
        console.error('Error processing routes:', error.message);
        process.exit(1);
    }
}

// Run the analysis only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { calculateRouteKPIs, analyzeRoutes, formatDuration, metersToMiles, parseVehicleCapacitiesFromJSON as parseVehicleCapacities, formatTime, parseArgs }; 