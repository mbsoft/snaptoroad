import PDFDocument from 'pdfkit';
import fs from 'fs';

export function generatePDFReport(results, overallSummary, vehicleCapacities) {
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
    });

    // Pipe to file
    const stream = fs.createWriteStream('route_analysis_report.pdf');
    doc.pipe(stream);

    // Header
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('Route Optimization Analysis Report', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(12)
       .font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, { align: 'center' });
    
    doc.moveDown(2);

    // Overall Summary Section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Overall Summary');
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica');

    const summaryData = [
        ['Metric', 'Value'],
        ['Total Routes', overallSummary.totalRoutes.toString()],
        ['Unassigned Trips', overallSummary.unassignedTrips.toString()],
        ['Total Miles', `${Math.round(overallSummary.totalMiles * 100) / 100}`],
        ['Total Revenue Miles', `${Math.round(overallSummary.totalRevenueMiles * 100) / 100}`],
        ['Total Empty Miles', `${Math.round(overallSummary.totalEmptyMiles * 100) / 100}`],
        ['Average Load %', `${Math.round(overallSummary.averageLoadPercentage * 100) / 100}%`],
        ['Total Duration', formatDuration(overallSummary.totalDuration)],
        ['Total Ambulatory Passengers', overallSummary.totalAmbulatoryPassengers.toString()],
        ['Total WC Passengers', overallSummary.totalWcPassengers.toString()],
        ['Total Passengers', overallSummary.totalPassengers.toString()],
        ['Overall Passengers per Hour', `${Math.round(overallSummary.passengersPerHour * 100) / 100}`],
        ['Average Miles per Route', `${Math.round((overallSummary.totalMiles / overallSummary.totalRoutes) * 100) / 100}`],
        ['Average Passengers per Route', `${Math.round((overallSummary.totalPassengers / overallSummary.totalRoutes) * 100) / 100}`]
    ];

    drawTable(doc, summaryData, 50, doc.y, 500, 12);
    doc.moveDown(3);

    // Route Details Section
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Route Details');
    
    doc.moveDown(1);

    // Table headers for route details
    const headers = [
        'Route', 'Start', 'End', 'Miles', 'Revenue', 'Empty', 'Load%', 'Passengers', 'Pax/Hr', 'Duration'
    ];

    const columnWidths = [60, 40, 40, 35, 40, 35, 30, 45, 35, 40];
    const startX = 50;
    let currentY = doc.y;

    // Draw header
    drawTableHeader(doc, headers, columnWidths, startX, currentY);
    currentY += 20;

    // Draw route data (paginated)
    let pageCount = 1;
    const rowsPerPage = 25;
    
    for (let i = 0; i < results.length; i++) {
        // Check if we need a new page
        if (i > 0 && i % rowsPerPage === 0) {
            doc.addPage();
            pageCount++;
            
            // Add page header
            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text(`Route Details (Page ${pageCount})`, 50, 50);
            
            currentY = 80;
            
            // Redraw header
            drawTableHeader(doc, headers, columnWidths, startX, currentY);
            currentY += 20;
        }

        const route = results[i];
        const rowData = [
            route.routeDescription,
            route.startTime,
            route.endTime,
            route.totalMiles.toString(),
            route.revenueMiles.toString(),
            route.emptyMiles.toString(),
            `${route.loadPercentage}%`,
            `${route.ambulatoryPassengers}A/${route.wcPassengers}W`,
            route.passengersPerHour.toString(),
            route.routeDuration
        ];

        drawTableRow(doc, rowData, columnWidths, startX, currentY);
        currentY += 15;
    }

    // Vehicle Capacity Summary
    doc.addPage();
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Vehicle Capacity Summary', 50, 50);
    
    doc.moveDown(1);

    const capacityData = [['Vehicle ID', 'Ambulatory Slots', 'WC Slots', 'Total Capacity']];
    
    // Sort vehicles by ID for better organization
    const sortedVehicles = Object.keys(vehicleCapacities).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const vehicleId of sortedVehicles) {
        const capacity = vehicleCapacities[vehicleId];
        capacityData.push([
            vehicleId,
            capacity.ambulatorySlots.toString(),
            capacity.wcSlots.toString(),
            capacity.totalCapacity.toString()
        ]);
    }

    drawTable(doc, capacityData, 50, doc.y, 500, 12);

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .text(`Page ${doc.bufferedPageRange().count}`, 50, doc.page.height - 50, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => {
            console.log('PDF report generated: route_analysis_report.pdf');
            resolve();
        });
        stream.on('error', reject);
    });
}

function drawTable(doc, data, x, y, width, rowHeight) {
    const colWidth = width / data[0].length;
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowY = y + (i * rowHeight);
        
        for (let j = 0; j < row.length; j++) {
            const cellX = x + (j * colWidth);
            const cellWidth = colWidth;
            
            // Draw cell border
            doc.rect(cellX, rowY, cellWidth, rowHeight).stroke();
            
            // Add text
            doc.fontSize(9)
               .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
               .text(row[j], cellX + 2, rowY + 2, {
                   width: cellWidth - 4,
                   height: rowHeight - 4,
                   align: 'left'
               });
        }
    }
}

function drawTableHeader(doc, headers, columnWidths, startX, y) {
    let currentX = startX;
    
    for (let i = 0; i < headers.length; i++) {
        const width = columnWidths[i];
        
        // Draw header cell
        doc.rect(currentX, y, width, 20).stroke();
        
        // Add header text
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .text(headers[i], currentX + 2, y + 2, {
               width: width - 4,
               height: 16,
               align: 'center'
           });
        
        currentX += width;
    }
}

function drawTableRow(doc, rowData, columnWidths, startX, y) {
    let currentX = startX;
    
    for (let i = 0; i < rowData.length; i++) {
        const width = columnWidths[i];
        
        // Draw cell border
        doc.rect(currentX, y, width, 15).stroke();
        
        // Add cell text
        doc.fontSize(7)
           .font('Helvetica')
           .text(rowData[i], currentX + 2, y + 2, {
               width: width - 4,
               height: 11,
               align: 'left'
           });
        
        currentX += width;
    }
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000); // Convert to milliseconds
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
} 