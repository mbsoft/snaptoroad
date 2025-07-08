// Test data for mobility route analysis

export const sampleRouteData = {
  code: 0,
  summary: {
    cost: 1000000,
    routes: 3,
    unassigned: 1,
    distance: 5000000
  },
  routes: [
    {
      vehicle: '2638',
      duration: 7200, // 2 hours
      steps: [
        {
          type: 'start',
          arrival: 1712489400, // 5:30 AM
          distance: 0,
          load: [0, 0]
        },
        {
          type: 'pickup',
          arrival: 1712490000,
          distance: 10000,
          load: [1, 0],
          id: 'passenger1'
        },
        {
          type: 'delivery',
          arrival: 1712493600,
          distance: 20000,
          load: [0, 0],
          id: 'passenger1'
        },
        {
          type: 'end',
          arrival: 1712496600, // 7:30 AM
          distance: 25000,
          load: [0, 0]
        }
      ]
    },
    {
      vehicle: '2462',
      duration: 10800, // 3 hours
      steps: [
        {
          type: 'start',
          arrival: 1712489400,
          distance: 0,
          load: [0, 0]
        },
        {
          type: 'pickup',
          arrival: 1712490000,
          distance: 15000,
          load: [2, 1],
          id: 'passenger2'
        },
        {
          type: 'delivery',
          arrival: 1712497200,
          distance: 35000,
          load: [0, 0],
          id: 'passenger2'
        },
        {
          type: 'end',
          arrival: 1712500200,
          distance: 40000,
          load: [0, 0]
        }
      ]
    }
  ],
  unassigned: [
    {
      id: 'unassigned1',
      type: 'pickup'
    }
  ]
}

export const sampleVehicleData = {
  2638: {
    ambulatorySlots: 3,
    wcSlots: 1,
    totalCapacity: 4
  },
  2462: {
    ambulatorySlots: 8,
    wcSlots: 2,
    totalCapacity: 10
  }
}

export const sampleCSVContent = `vehicle_id,start_location_latitude,start_location_longitude,end_location_latitude,end_location_longitude,ambulatory_slots,wc_slots,shift_start,shift_end
2638,26.68488,-80.17861,26.68488,-80.17861,3,1,4/7/2024 5:30:00 AM,4/7/2024 8:30:00 PM
2462,26.68488,-80.17861,26.68488,-80.17861,8,2,4/7/2024 5:30:00 AM,4/7/2024 8:30:00 PM`

export const expectedRoute1KPIs = {
  routeDescription: 'Route 1 - Vehicle 2638',
  startTime: '11:30',
  endTime: '13:30',
  totalMiles: 15.53,
  revenueMiles: 6.21,
  emptyMiles: 9.32,
  loadPercentage: 25,
  ambulatoryPassengers: 1,
  wcPassengers: 0,
  totalPassengers: 1,
  passengersPerHour: 0.5
}

export const expectedRoute2KPIs = {
  routeDescription: 'Route 2 - Vehicle 2462',
  startTime: '11:30',
  endTime: '14:30',
  totalMiles: 24.85,
  revenueMiles: 18.64,
  emptyMiles: 15.53,
  loadPercentage: 30,
  ambulatoryPassengers: 2,
  wcPassengers: 1,
  totalPassengers: 3,
  passengersPerHour: 1
}
