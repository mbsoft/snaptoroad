import fs from 'fs'
import { generatePDFReport } from './pdf_generator.js'

// Constants
const METERS_TO_MILES = 0.000621371 // Conversion factor from meters to miles

// Helper function to format duration in h:mm format
function formatDuration (seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}:${minutes.toString().padStart(2, '0')}`
}

// Helper function to convert Unix timestamp to readable time
function formatTime (timestamp) {
  const date = new Date(timestamp * 1000) // Convert to milliseconds
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// Helper function to convert meters to miles
function metersToMiles (meters) {
  return meters * METERS_TO_MILES
}

// Helper function to pad strings for table formatting
function pad (str, len) {
  str = String(str)
  return str + ' '.repeat(Math.max(0, len - str.length))
}

// Parse vehicle capacities from JSON file
function parseVehicleCapacitiesFromJSON (jsonFilePath) {
  const vehicles = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'))
  const vehicleCapacities = {}
  for (const v of vehicles) {
    const vehicleId = String(v.id)
    const ambulatorySlots = Array.isArray(v.capacity) ? v.capacity[0] : 0
    const wcSlots = Array.isArray(v.capacity) ? v.capacity[1] : 0
    const totalCapacity = ambulatorySlots + wcSlots
    vehicleCapacities[vehicleId] = {
      capacity: v.capacity,
      totalCapacity,
      start_index: v.start_index,
      end_index: v.end_index,
      time_window: v.time_window,
      max_working_time: v.max_working_time
    }
  }
  return vehicleCapacities
}

// Helper to format duration as X HRS Y MN
function formatDurationHrsMin (seconds) {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hrs} HRS ${mins} MN`
}

// Output results in a plain text table format for email
function printEmailTable (results, overallSummary) {
  // Determine column widths
  const headers = [
    'Route', 'Start Time', 'End Time', 'Total Miles', 'Rev Miles', 'Empty Miles', 'Load %', 'Pax', 'Pax/Hr', 'Total Duration', 'Wait Time'
  ]
  const colWidths = [
    30, 10, 10, 12, 14, 12, 8, 12, 8, 12, 12
  ]

  // Header
  let table = `${headers.map((h, i) => pad(h, colWidths[i])).join(' | ')}\n`
  table += `${colWidths.map(w => '-'.repeat(w)).join('-|-')}\n`

  // Rows
  for (const row of results) {
    const passengerInfo = `${row.ambulatoryPassengers}A/${row.wcPassengers}W`
    table += `${[
      pad(row.routeDescription, colWidths[0]),
      pad(row.startTime, colWidths[1]),
      pad(row.endTime, colWidths[2]),
      pad(Math.round(row.totalMiles), colWidths[3]),
      pad(Math.round(row.revenueMiles), colWidths[4]),
      pad(Math.round(row.emptyMiles), colWidths[5]),
      pad(`${row.loadPercentage}%`, colWidths[6]),
      pad(passengerInfo, colWidths[7]),
      pad(row.passengersPerHour, colWidths[8]),
      pad(row.totalDuration, colWidths[9]),
      pad(row.waitTime, colWidths[10])
    ].join(' | ')}\n`
  }

  // Summary
  table += '\n'
  table += 'OVERALL SUMMARY\n'
  table += `Total Routes: ${overallSummary.totalRoutes}\n`
  table += `Unassigned Trips: ${overallSummary.unassignedTrips}\n`
  table += `Total Trips: ${overallSummary.totalTrips}\n`
  table += `Total Miles: ${Math.round(overallSummary.totalMiles)}\n`
  table += `Total Revenue Miles: ${Math.round(overallSummary.totalRevenueMiles)}\n`
  table += `Total Empty Miles: ${Math.round(overallSummary.totalEmptyMiles)}\n`
  table += `Average Load %: ${Math.round(overallSummary.averageLoadPercentage * 100) / 100}%\n`
  table += `Total Duration: ${formatDurationHrsMin(overallSummary.totalDuration)}\n`
  table += `Total Ambulatory Passengers: ${overallSummary.totalAmbulatoryPassengers}\n`
  table += `Total WC Passengers: ${overallSummary.totalWcPassengers}\n`
  table += `Total Passengers: ${overallSummary.totalPassengers}\n`
  table += `Overall Passengers per Hour: ${Math.round(overallSummary.passengersPerHour * 100) / 100}\n`
  table += `Average Miles per Route: ${Math.round((overallSummary.totalMiles / overallSummary.totalRoutes) * 100) / 100}\n`
  table += `Average Revenue Miles per Route: ${Math.round((overallSummary.totalRevenueMiles / overallSummary.totalRoutes) * 100) / 100}\n`
  table += `Average Empty Miles per Route: ${Math.round((overallSummary.totalEmptyMiles / overallSummary.totalRoutes) * 100) / 100}\n`
  table += `Average Passengers per Route: ${Math.round((overallSummary.totalPassengers / overallSummary.totalRoutes) * 100) / 100}\n`

  console.log('\n=== COPY/PASTE FOR EMAIL ===\n')
  console.log(table)
}

// Calculate KPIs for a single route
function calculateRouteKPIs (route, routeIndex, vehicleCapacities) {
  const steps = route.steps
  let totalMiles = 0
  let revenueMiles = 0
  let emptyMiles = 0
  let previousDistance = 0
  let totalLoadMiles = 0 // For calculating average load percentage
  let ambulatoryPassengers = 0 // Count of ambulatory passengers transported
  let wcPassengers = 0 // Count of wheelchair passengers transported
  const passengerTracking = new Set() // Track unique passengers to avoid double counting
  let totalTrips = 0 // Count of steps where load values change

  // Get vehicle capacity
  const vehicleId = route.vehicle
  const vehicle = vehicleCapacities[vehicleId] || { capacity: [0, 0], totalCapacity: 1 }

  // Ensure vehicle has required properties
  if (!vehicle.totalCapacity || typeof vehicle.totalCapacity !== 'number') {
    vehicle.totalCapacity = 1
  }

  // Extract start and end times
  const startStep = steps.find(step => step.type === 'start')
  const endStep = steps.find(step => step.type === 'end')
  const startTime = startStep ? formatTime(startStep.arrival) : 'Unknown'
  const endTime = endStep ? formatTime(endStep.arrival) : 'Unknown'

  // Calculate actual route duration from timestamps
  const actualDuration = startStep && endStep ? (endStep.arrival - startStep.arrival) : 0

  // Get drive time from route data
  const driveTime = route.duration || 0

  // Calculate total waiting time for the route
  let totalWaitTime = 0
  for (let i = 0; i < steps.length; i++) {
    if (typeof steps[i].waiting_time === 'number') {
      totalWaitTime += steps[i].waiting_time
    }
  }

  // Process each step
  for (let i = 1; i < steps.length; i++) {
    const prevLoad = steps[i - 1].load || [0, 0]
    const currLoad = steps[i].load || [0, 0]
    const step = steps[i]
    const currentDistance = step.distance || 0

    // Calculate distance for this segment
    const segmentDistance = currentDistance - previousDistance
    const segmentMiles = metersToMiles(segmentDistance)

    // Add to total miles
    totalMiles = metersToMiles(currentDistance)

    // Count steps where load values change
    const prevTotalLoad = (prevLoad[0] || 0) + (prevLoad[1] || 0)
    const currTotalLoad = (currLoad[0] || 0) + (currLoad[1] || 0)
    if (prevTotalLoad !== currTotalLoad) {
      totalTrips++
    }

    // Calculate revenue miles and empty miles for this segment
    const totalPassengers = (prevLoad[0] || 0) + (prevLoad[1] || 0) // Use load from previous step

    if (totalPassengers > 0) {
      revenueMiles += segmentMiles * totalPassengers
    } else {
      emptyMiles += segmentMiles
    }

    // Calculate load percentage for this segment
    const loadPercentage = (totalPassengers / vehicle.totalCapacity) * 100
    totalLoadMiles += segmentMiles * loadPercentage

    // Track passenger counts for delivery steps
    if (step.type === 'delivery' && step.id) {
      const passengerId = step.id
      if (!passengerTracking.has(passengerId)) {
        passengerTracking.add(passengerId)

        // Determine passenger type based on the load pattern
        // This is a simplified approach - in a real scenario you might have passenger type data
        // For now, we'll estimate based on the load at pickup vs delivery
        const pickupStep = steps.find(s => s.id === passengerId && s.type === 'pickup')
        if (pickupStep) {
          const pickupLoad = pickupStep.load || [0, 0]
          const deliveryLoad = step.load || [0, 0]

          // Calculate the difference to determine passenger type
          const ambDiff = (pickupLoad[0] || 0) - (deliveryLoad[0] || 0)
          const wcDiff = (pickupLoad[1] || 0) - (deliveryLoad[1] || 0)

          if (ambDiff > 0) {
            ambulatoryPassengers += ambDiff
          }
          if (wcDiff > 0) {
            wcPassengers += wcDiff
          }
        }
      }
    }

    // Only count pickups (positive change in load)
    if (step.type === 'pickup') {
      const ambDiff = (currLoad[0] || 0) - (prevLoad[0] || 0)
      const wcDiff = (currLoad[1] || 0) - (prevLoad[1] || 0)
      if (ambDiff > 0) ambulatoryPassengers += ambDiff
      if (wcDiff > 0) wcPassengers += wcDiff
    }

    // Update for next iteration
    previousDistance = currentDistance
  }

  // Calculate average load percentage for the route
  const averageLoadPercentage = totalMiles > 0 ? totalLoadMiles / totalMiles : 0

  // Calculate passengers per hour (using total duration)
  const totalPassengers = ambulatoryPassengers + wcPassengers
  const routeHours = actualDuration / 3600 // Convert seconds to hours
  const passengersPerHour = routeHours > 0 ? totalPassengers / routeHours : 0

  // Calculate drive time percentage
  const driveTimePercentage = actualDuration > 0 ? (driveTime / actualDuration) * 100 : 0

  // Create route description
  const routeDescription = `Route ${routeIndex + 1} - Vehicle ${route.vehicle || 'Unknown'}`

  return {
    routeDescription: routeDescription || 'Unknown Route',
    startTime: startTime || 'Unknown',
    endTime: endTime || 'Unknown',
    totalMiles: Math.round((totalMiles || 0) * 100) / 100, // Round to 2 decimal places
    revenueMiles: Math.round((revenueMiles || 0) * 100) / 100,
    emptyMiles: Math.round((emptyMiles || 0) * 100) / 100,
    loadPercentage: Math.round((averageLoadPercentage || 0) * 100) / 100,
    totalDuration: formatDuration(actualDuration || 0),
    driveTime: formatDuration(driveTime || 0),
    driveTimePercentage: Math.round((driveTimePercentage || 0) * 100) / 100,
    waitTime: formatDuration(totalWaitTime || 0),
    vehicleCapacity: vehicle.totalCapacity || 1,
    ambulatoryPassengers: ambulatoryPassengers || 0,
    wcPassengers: wcPassengers || 0,
    totalPassengers: totalPassengers || 0,
    passengersPerHour: Math.round((passengersPerHour || 0) * 100) / 100,
    totalTrips: totalTrips || 0
  }
}

// Main analysis function
function analyzeRoutes (data, vehicleCapacities) {
  const routes = data.result.routes
  const results = []
  const overallSummary = {
    totalRoutes: routes.length,
    totalMiles: 0,
    totalRevenueMiles: 0,
    totalEmptyMiles: 0,
    totalLoadMiles: 0,
    totalDuration: 0,
    totalDriveTime: 0,
    totalAmbulatoryPassengers: 0,
    totalWcPassengers: 0,
    totalPassengers: 0,
    totalTrips: 0,
    unassignedTrips: data.result.unassigned ? Math.floor(data.result.unassigned.length / 2) : 0
  }

  console.log('=== ROUTE ANALYSIS RESULTS ===\n')

  // Analyze each route
  for (let i = 0; i < routes.length; i++) {
    const routeKPIs = calculateRouteKPIs(routes[i], i, vehicleCapacities)
    results.push(routeKPIs)

    // Calculate actual duration and drive time for this route
    const steps = routes[i].steps
    const startStep = steps.find(step => step.type === 'start')
    const endStep = steps.find(step => step.type === 'end')
    const actualDuration = startStep && endStep ? (endStep.arrival - startStep.arrival) : 0
    const driveTime = routes[i].duration || 0

    // Add to overall summary
    overallSummary.totalMiles += routeKPIs.totalMiles || 0
    overallSummary.totalRevenueMiles += routeKPIs.revenueMiles || 0
    overallSummary.totalEmptyMiles += routeKPIs.emptyMiles || 0
    overallSummary.totalLoadMiles += (routeKPIs.totalMiles || 0) * (routeKPIs.loadPercentage || 0)
    overallSummary.totalDuration += actualDuration || 0
    overallSummary.totalDriveTime += driveTime || 0
    overallSummary.totalAmbulatoryPassengers += routeKPIs.ambulatoryPassengers || 0
    overallSummary.totalWcPassengers += routeKPIs.wcPassengers || 0
    overallSummary.totalPassengers += routeKPIs.totalPassengers || 0
    overallSummary.totalTrips += Math.floor((routeKPIs.totalTrips || 0) / 2)

    // Print individual route results
    console.log(`${routeKPIs.routeDescription || 'Unknown Route'}`)
    console.log(`  Total Miles: ${Math.round(routeKPIs.totalMiles || 0)}`)
    console.log(`  Revenue Miles: ${Math.round(routeKPIs.revenueMiles || 0)}`)
    console.log(`  Empty Miles: ${Math.round(routeKPIs.emptyMiles || 0)}`)
    console.log(`  Load %: ${routeKPIs.loadPercentage || 0}%`)
    console.log(`  Vehicle Capacity: ${routeKPIs.vehicleCapacity || 0}`)
    console.log(`  Ambulatory Passengers: ${routeKPIs.ambulatoryPassengers || 0}`)
    console.log(`  WC Passengers: ${routeKPIs.wcPassengers || 0}`)
    console.log(`  Total Passengers: ${routeKPIs.totalPassengers || 0}`)
    console.log(`  Passengers per Hour: ${routeKPIs.passengersPerHour || 0}`)
    console.log(`  Total Duration: ${routeKPIs.totalDuration || 'Unknown'}`)
    console.log(`  Wait: ${routeKPIs.waitTime || 'Unknown'}`)
    console.log('')
  }

  // Calculate average load percentage
  overallSummary.averageLoadPercentage = overallSummary.totalMiles > 0
    ? overallSummary.totalLoadMiles / overallSummary.totalMiles
    : 0

  // Calculate overall passengers per hour
  const totalHours = overallSummary.totalDuration / 3600
  overallSummary.passengersPerHour = totalHours > 0
    ? overallSummary.totalPassengers / totalHours
    : 0

  // Print overall summary
  console.log('=== OVERALL SUMMARY ===')
  console.log(`Total Routes: ${overallSummary.totalRoutes}`)
  console.log(`Unassigned Trips: ${overallSummary.unassignedTrips}`)
  console.log(`Total Trips: ${overallSummary.totalTrips}`)
  console.log(`Total Miles: ${Math.round(overallSummary.totalMiles)}`)
  console.log(`Total Revenue Miles: ${Math.round(overallSummary.totalRevenueMiles)}`)
  console.log(`Total Empty Miles: ${Math.round(overallSummary.totalEmptyMiles)}`)
  console.log(`Average Load %: ${Math.round(overallSummary.averageLoadPercentage * 100) / 100}%`)
  console.log(`Total Duration: ${formatDurationHrsMin(overallSummary.totalDuration)}`)
  console.log(`Total Ambulatory Passengers: ${overallSummary.totalAmbulatoryPassengers}`)
  console.log(`Total WC Passengers: ${overallSummary.totalWcPassengers}`)
  console.log(`Total Passengers: ${overallSummary.totalPassengers}`)
  console.log(`Overall Passengers per Hour: ${Math.round(overallSummary.passengersPerHour * 100) / 100}`)
  console.log(`Average Miles per Route: ${Math.round((overallSummary.totalMiles / overallSummary.totalRoutes) * 100) / 100}`)
  console.log(`Average Revenue Miles per Route: ${Math.round((overallSummary.totalRevenueMiles / overallSummary.totalRoutes) * 100) / 100}`)
  console.log(`Average Empty Miles per Route: ${Math.round((overallSummary.totalEmptyMiles / overallSummary.totalRoutes) * 100) / 100}`)
  console.log(`Average Passengers per Route: ${Math.round((overallSummary.totalPassengers / overallSummary.totalRoutes) * 100) / 100}`)

  return { results, overallSummary }
}

// Parse command line arguments for input files
function parseArgs () {
  const args = process.argv.slice(2)
  let jsonFile = './test_mobility_solution.json'
  let vehicleFile = './test_vehicles.json'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: node mobility_route_report.js [route_solution.json] [vehicles.json]')
      console.log('Defaults: ./test_mobility_solution.json ./test_vehicles.json')
      process.exit(0)
    }
    if (i === 0 && args[i].endsWith('.json')) jsonFile = args[i]
    if (i === 1 && args[i].endsWith('.json')) vehicleFile = args[i]
  }
  return { jsonFile, vehicleFile }
}

// Main execution
async function main () {
  try {
    // Parse command line args
    const { jsonFile, vehicleFile } = parseArgs()
    // Read the JSON file
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
    // Parse vehicle capacities from JSON
    const vehicleCapacities = parseVehicleCapacitiesFromJSON(vehicleFile)
    console.log(`Loaded capacity data for ${Object.keys(vehicleCapacities).length} vehicles\n`)
    // Perform analysis
    const analysis = analyzeRoutes(data, vehicleCapacities)
    // Print email table
    printEmailTable(analysis.results, analysis.overallSummary)
    // Generate PDF report
    console.log('\n=== GENERATING PDF REPORT ===')
    await generatePDFReport(analysis.results, analysis.overallSummary, vehicleCapacities)
    // Save results to file
    const outputData = {
      timestamp: new Date().toISOString(),
      individualRoutes: analysis.results,
      overallSummary: analysis.overallSummary,
      vehicleCapacities
    }
    fs.writeFileSync('route_analysis_results.json', JSON.stringify(outputData, null, 2))
    console.log('\n=== RESULTS SAVED ===')
    console.log('Detailed results have been saved to: route_analysis_results.json')
    console.log('PDF report has been saved to: route_analysis_report.pdf')
  } catch (error) {
    console.error('Error processing routes:', error.message)
    process.exit(1)
  }
}

// Run the analysis only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { calculateRouteKPIs, analyzeRoutes, formatDuration, metersToMiles, parseVehicleCapacitiesFromJSON as parseVehicleCapacities, formatTime, parseArgs }
