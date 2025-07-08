import PDFDocument from 'pdfkit'
import fs from 'fs'

export function generatePDFReport (results, overallSummary, vehicleCapacities) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'Route Optimization Analysis Report',
      Author: 'Route Analysis System',
      Subject: 'Transportation Efficiency Metrics',
      Keywords: 'route optimization, transportation, efficiency',
      CreationDate: new Date()
    }
  })

  // Pipe to file
  const stream = fs.createWriteStream('route_analysis_report.pdf')
  doc.pipe(stream)

  // Add header with NextBillion.ai branding
  addHeader(doc)

  doc.moveDown(1)

  // Header
  doc.y = 80 // Move the cursor further down to avoid overlap

  doc.fontSize(24)
    .font('Helvetica-Bold')
    .text('Route Optimization Analysis Report', { align: 'center' })

  doc.moveDown(0.5)
  doc.fontSize(12)
    .font('Helvetica')
    .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' })

  doc.moveDown(2)

  // Overall Summary Section
  doc.fontSize(16)
    .font('Helvetica-Bold')
    .text('Overall Summary', { align: 'left' })

  doc.moveDown(0.5)
  doc.fontSize(10)
    .font('Helvetica')

  const summaryData = [
    ['Metric', 'Value'],
    ['Total Routes', (overallSummary.totalRoutes ?? 0).toString()],
    ['Unassigned Trips', (overallSummary.unassignedTrips ?? 0).toString()],
    ['Total Trips', (overallSummary.totalTrips ?? 0).toString()],
    ['Total Miles', `${Math.round(overallSummary.totalMiles ?? 0)}`],
    ['Total Revenue Miles', `${Math.round(overallSummary.totalRevenueMiles ?? 0)}`],
    ['Total Empty Miles', `${Math.round(overallSummary.totalEmptyMiles ?? 0)}`],
    ['Average Load %', `${Math.round((overallSummary.averageLoadPercentage ?? 0) * 100) / 100}%`],
    ['Total Ambulatory Passengers', (overallSummary.totalAmbulatoryPassengers ?? 0).toString()],
    ['Total WC Passengers', (overallSummary.totalWcPassengers ?? 0).toString()],
    ['Total Passengers', (overallSummary.totalPassengers ?? 0).toString()],
    ['Overall Passengers per Hour', `${Math.round((overallSummary.passengersPerHour ?? 0) * 100) / 100}`],
    ['Average Miles per Route', `${Math.round((overallSummary.totalMiles ?? 0) / (overallSummary.totalRoutes ?? 1))}`],
    ['Average Passengers per Route', `${Math.round((overallSummary.totalPassengers ?? 0) / (overallSummary.totalRoutes ?? 1))}`]
  ]

  drawTable(doc, summaryData, 50, doc.y, 500, 12)
  doc.moveDown(3)

  // Route Details Section
  doc.fontSize(16)
    .font('Helvetica-Bold')
    .text('Route Details', { align: 'left' })

  doc.moveDown(1)

  // Table headers for route details
  const headers = [
    'Vehicle', 'Start', 'End', 'Miles', 'Rev Miles', 'Empty Miles', 'Load%', 'Pax', 'Pax/Hr', 'Total Duration', 'Wait Time'
  ]

  const startX = 30
  const columnWidths = [60, 40, 40, 50, 50, 50, 35, 60, 40, 60, 45] // Adjusted for wider table
  let currentY = doc.y

  // Draw header
  drawTableHeader(doc, headers, columnWidths, startX, currentY)
  currentY += 20

  // Draw route data (paginated)
  let pageCount = 1
  const rowsPerPage = 32 // Allow more rows per page

  for (let i = 0; i < results.length; i++) {
    // Check if we need a new page
    if (i > 0 && i % rowsPerPage === 0) {
      doc.addPage()
      pageCount++

      // Add header to new page
      addHeader(doc)

      // Add page header
      doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(`Route Details (Page ${pageCount})`, 50, 90)

      currentY = 120

      // Redraw header
      drawTableHeader(doc, headers, columnWidths, startX, currentY)
      currentY += 20
    }

    const route = results[i]
    // Extract vehicle ID and get capacity info
    const vehicleId = route.routeDescription.split('Vehicle ')[1] || 'Unknown'
    const vehicleCapacity = vehicleCapacities[vehicleId]
    const ambCapacity = vehicleCapacity && Array.isArray(vehicleCapacity.capacity) ? vehicleCapacity.capacity[0] : 0
    const wcCapacity = vehicleCapacity && Array.isArray(vehicleCapacity.capacity) ? vehicleCapacity.capacity[1] : 0
    const vehicleDisplay = `${vehicleId} (${ambCapacity}A/${wcCapacity}W)`

    const rowData = [
      vehicleDisplay,
      route.startTime,
      route.endTime,
      Math.round(route.totalMiles).toString(),
      Math.round(route.revenueMiles).toString(),
      Math.round(route.emptyMiles).toString(),
      `${route.loadPercentage}%`,
      `${route.ambulatoryPassengers}A/${route.wcPassengers}W`,
      route.passengersPerHour.toString(),
      route.totalDuration,
      route.waitTime
    ]

    drawTableRow(doc, rowData, columnWidths, startX, currentY)
    currentY += 15
  }

  // Vehicle Capacity Summary
  doc.addPage()

  // Add header to new page
  addHeader(doc)

  doc.fontSize(16)
    .font('Helvetica-Bold')
    .text('Vehicle Capacity Summary', 50, 90)

  doc.moveDown(1)

  const capacityData = [['Vehicle ID', 'Ambulatory Slots', 'WC Slots', 'Total Capacity']]

  // Sort vehicles by ID for better organization
  const sortedVehicles = Object.keys(vehicleCapacities).sort((a, b) => parseInt(a) - parseInt(b))

  for (const vehicleId of sortedVehicles) {
    const capacity = vehicleCapacities[vehicleId]
    const ambulatorySlots = Array.isArray(capacity.capacity) ? capacity.capacity[0] : 0
    const wcSlots = Array.isArray(capacity.capacity) ? capacity.capacity[1] : 0
    capacityData.push([
      vehicleId,
      ambulatorySlots.toString(),
      wcSlots.toString(),
      capacity.totalCapacity.toString()
    ])
  }

  drawTable(doc, capacityData, 50, doc.y, 500, 12)

  // Footer: smaller font and less vertical space
  doc.fontSize(6)
    .font('Helvetica')
    .text(`Page ${doc.bufferedPageRange().count}`, 30, doc.page.height - 20, { align: 'center' })

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log('PDF report generated: route_analysis_report.pdf')
      resolve()
    })
    stream.on('error', reject)
  })
}

// Function to add NextBillion.ai header to each page
function addHeader (doc) {
  // Save current position
  const currentY = doc.y

  try {
    // Add the MapFusion logo image
    doc.image('mapfusion.png', 50, 20, { width: 67 })

    // Add "Powered by NextBillion.ai" text next to the logo
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#1a73e8') // Google blue color
      .text('Powered by NextBillion.ai', 180, 35)

    // Reset color
    doc.fillColor('#000000')

    // Move the line separator higher (just below the logo/text)
    doc.moveTo(50, 60)
      .lineTo(550, 60)
      .stroke()
  } catch (error) {
    // Fallback to text-based logo if image fails to load
    console.warn('Could not load mapfusion.png, using text-based logo')

    // Create a simple text-based logo/header
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a73e8') // Google blue color
      .text('NextBillion.ai', 50, 30)

    // Add "Powered by" text
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Powered by NextBillion.ai', 50, 50)

    // Reset color
    doc.fillColor('#000000')

    // Move the line separator higher
    doc.moveTo(50, 60)
      .lineTo(550, 60)
      .stroke()
  }

  // Restore position
  doc.y = currentY
}

function drawTable (doc, data, x, y, width, rowHeight) {
  const colWidth = width / data[0].length

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowY = y + (i * rowHeight)

    for (let j = 0; j < row.length; j++) {
      const cellX = x + (j * colWidth)
      const cellWidth = colWidth

      // Draw cell border
      doc.rect(cellX, rowY, cellWidth, rowHeight).stroke()

      // Add text
      doc.fontSize(9)
        .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .text(row[j], cellX + 2, rowY + 2, {
          width: cellWidth - 4,
          height: rowHeight - 4,
          align: 'left'
        })
    }
  }
}

function drawTableHeader (doc, headers, columnWidths, startX, y) {
  let currentX = startX

  for (let i = 0; i < headers.length; i++) {
    const width = columnWidths[i]

    // Draw header cell
    doc.rect(currentX, y, width, 20).stroke()

    // Add header text
    doc.fontSize(8)
      .font('Helvetica-Bold')
      .text(headers[i], currentX + 2, y + 2, {
        width: width - 4,
        height: 16,
        align: 'center'
      })

    currentX += width
  }
}

function drawTableRow (doc, rowData, columnWidths, startX, y) {
  let currentX = startX

  for (let i = 0; i < rowData.length; i++) {
    const width = columnWidths[i]

    // Draw cell border
    doc.rect(currentX, y, width, 15).stroke()

    // Add cell text
    doc.fontSize(7)
      .font('Helvetica')
      .text(rowData[i], currentX + 2, y + 2, {
        width: width - 4,
        height: 11,
        align: 'left'
      })

    currentX += width
  }
}

