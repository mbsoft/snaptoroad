// Tests for PDF generation functionality

import { generatePDFReport } from '../pdf_generator.js'
import { assertFileExists } from './test_utils.js'
import fs from 'fs'

const sampleVehicleData = {
  2638: {
    capacity: [3, 1],
    totalCapacity: 4
  },
  2462: {
    capacity: [8, 2],
    totalCapacity: 10
  }
}

function testPDFGeneration () {
  const results = [
    {
      routeDescription: 'Route 1 - Vehicle 2638',
      startTime: '05:30',
      endTime: '07:30',
      totalMiles: 15.53,
      revenueMiles: 6.21,
      emptyMiles: 9.32,
      loadPercentage: 25,
      ambulatoryPassengers: 1,
      wcPassengers: 0,
      totalPassengers: 1,
      passengersPerHour: 0.5
    }
  ]

  const overallSummary = {
    totalRoutes: 1,
    totalMiles: 15.53,
    totalRevenueMiles: 6.21,
    totalEmptyMiles: 9.32,
    averageLoadPercentage: 25,
    totalDuration: 7200,
    totalAmbulatoryPassengers: 1,
    totalWcPassengers: 0,
    totalPassengers: 1,
    passengersPerHour: 0.5,
    unassignedTrips: 0
  }

  // Generate PDF
  return generatePDFReport(results, overallSummary, sampleVehicleData)
    .then(() => {
      // Check that PDF file was created
      assertFileExists('route_analysis_report.pdf', 'PDF file should be created')

      // Check file size (should be reasonable for a PDF)
      const stats = fs.statSync('route_analysis_report.pdf')
      if (stats.size < 1000) {
        throw new Error('PDF file seems too small, may be corrupted')
      }

      console.log('✅ PDF generation test passed')
    })
    .catch(error => {
      throw new Error(`PDF generation failed: ${error.message}`)
    })
}

function testPDFWithMultipleRoutes () {
  const results = [
    {
      routeDescription: 'Route 1 - Vehicle 2638',
      startTime: '05:30',
      endTime: '07:30',
      totalMiles: 15.53,
      revenueMiles: 6.21,
      emptyMiles: 9.32,
      loadPercentage: 25,
      ambulatoryPassengers: 1,
      wcPassengers: 0,
      totalPassengers: 1,
      passengersPerHour: 0.5
    },
    {
      routeDescription: 'Route 2 - Vehicle 2462',
      startTime: '05:30',
      endTime: '08:30',
      totalMiles: 24.85,
      revenueMiles: 18.64,
      emptyMiles: 15.53,
      loadPercentage: 30,
      ambulatoryPassengers: 2,
      wcPassengers: 1,
      totalPassengers: 3,
      passengersPerHour: 1
    }
  ]

  const overallSummary = {
    totalRoutes: 2,
    totalMiles: 40.38,
    totalRevenueMiles: 24.85,
    totalEmptyMiles: 24.85,
    averageLoadPercentage: 27.5,
    totalDuration: 18000,
    totalAmbulatoryPassengers: 3,
    totalWcPassengers: 1,
    totalPassengers: 4,
    passengersPerHour: 0.8,
    unassignedTrips: 1
  }

  return generatePDFReport(results, overallSummary, sampleVehicleData)
    .then(() => {
      assertFileExists('route_analysis_report.pdf', 'PDF file should be created with multiple routes')

      const stats = fs.statSync('route_analysis_report.pdf')
      if (stats.size < 1000) {
        throw new Error('PDF file seems too small for multiple routes')
      }

      console.log('✅ Multi-route PDF generation test passed')
    })
}

function testPDFWithEmptyData () {
  const results = []
  const overallSummary = {
    totalRoutes: 0,
    totalMiles: 0,
    totalRevenueMiles: 0,
    totalEmptyMiles: 0,
    averageLoadPercentage: 0,
    totalDuration: 0,
    totalAmbulatoryPassengers: 0,
    totalWcPassengers: 0,
    totalPassengers: 0,
    passengersPerHour: 0,
    unassignedTrips: 0
  }

  return generatePDFReport(results, overallSummary, {})
    .then(() => {
      assertFileExists('route_analysis_report.pdf', 'PDF file should be created even with empty data')
      console.log('✅ Empty data PDF generation test passed')
    })
}

function testPDFWithLargeVehicleData () {
  const largeVehicleData = {}
  for (let i = 1; i <= 100; i++) {
    largeVehicleData[`vehicle${i}`] = {
      capacity: [8, 2],
      totalCapacity: 10
    }
  }

  const results = [
    {
      routeDescription: 'Route 1 - Vehicle vehicle1',
      startTime: '05:30',
      endTime: '07:30',
      totalMiles: 15.53,
      revenueMiles: 6.21,
      emptyMiles: 9.32,
      loadPercentage: 25,
      ambulatoryPassengers: 1,
      wcPassengers: 0,
      totalPassengers: 1,
      passengersPerHour: 0.5
    }
  ]

  const overallSummary = {
    totalRoutes: 1,
    totalMiles: 15.53,
    totalRevenueMiles: 6.21,
    totalEmptyMiles: 9.32,
    averageLoadPercentage: 25,
    totalDuration: 7200,
    totalAmbulatoryPassengers: 1,
    totalWcPassengers: 0,
    totalPassengers: 1,
    passengersPerHour: 0.5,
    unassignedTrips: 0
  }

  return generatePDFReport(results, overallSummary, largeVehicleData)
    .then(() => {
      assertFileExists('route_analysis_report.pdf', 'PDF file should be created with large vehicle data')
      console.log('✅ Large vehicle data PDF generation test passed')
    })
}

// Clean up function
function cleanupPDFFiles () {
  const pdfFile = 'route_analysis_report.pdf'
  if (fs.existsSync(pdfFile)) {
    fs.unlinkSync(pdfFile)
  }
}

// Run all PDF tests
export async function runPDFTests () {
  console.log('Running PDF generation tests...\n')

  try {
    await testPDFGeneration()
    cleanupPDFFiles()

    await testPDFWithMultipleRoutes()
    cleanupPDFFiles()

    await testPDFWithEmptyData()
    cleanupPDFFiles()

    await testPDFWithLargeVehicleData()
    cleanupPDFFiles()

    console.log('\n✅ All PDF tests passed!')
  } catch (error) {
    console.log(`❌ PDF test failed: ${error.message}`)
    cleanupPDFFiles()
    throw error
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPDFTests().catch(error => {
    console.error('PDF tests failed:', error)
    process.exit(1)
  })
}
