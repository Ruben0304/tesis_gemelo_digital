/**
 * GraphQL queries and mutations for the Digital Twin API
 */

// ============================================================================
// Queries
// ============================================================================

export const HELLO_QUERY = `
  query Hello {
    hello
  }
`

export const SOLAR_DATA_QUERY = `
  query SolarData {
    solarData {
      current {
        production
        consumption
        batteryLevel
        efficiency
        timestamp
      }
      battery {
        level
        capacityKwh
        charging
        powerKw
        autonomyHours
      }
      timeline {
        hour
        production
        consumption
        batteryLevel
      }
      metrics {
        productionKwh
        consumptionKwh
        co2AvoidedKg
        gridImportKwh
        gridExportKwh
      }
      energyFlow {
        solarToLoad
        solarToBattery
        solarToGrid
        batteryToLoad
        gridToLoad
      }
    }
  }
`

export const WEATHER_QUERY = `
  query Weather {
    weather {
      current {
        temperature
        humidity
        cloudCover
        solarRadiation
        windSpeed
        condition
        timestamp
      }
      forecast {
        date
        tempMax
        tempMin
        condition
        solarRadiationAvg
        precipitationProb
      }
    }
  }
`

export const PREDICTIONS_QUERY = `
  query Predictions {
    predictions {
      predictions {
        hour
        productionKwh
        consumptionKwh
        batteryLevel
        confidence
        hasBlackout
        weatherCondition
      }
      alerts {
        severity
        message
        type
        timestamp
      }
      summary
    }
  }
`

export const PANELS_QUERY = `
  query Panels {
    panels {
      id
      name
      manufacturer
      model
      ratedPowerKw
      quantity
      strings
      efficiencyPercent
      areaM2
      tiltDegrees
      orientation
      notes
      createdAt
      updatedAt
    }
  }
`

export const PANEL_QUERY = `
  query Panel($id: String!) {
    panel(id: $id) {
      id
      name
      manufacturer
      model
      ratedPowerKw
      quantity
      strings
      efficiencyPercent
      areaM2
      tiltDegrees
      orientation
      notes
      createdAt
      updatedAt
    }
  }
`

export const BATTERIES_QUERY = `
  query Batteries {
    batteries {
      id
      name
      manufacturer
      model
      capacityKwh
      quantity
      maxDepthOfDischargePercent
      chargeRateKw
      dischargeRateKw
      efficiencyPercent
      chemistry
      nominalVoltage
      notes
      createdAt
      updatedAt
    }
  }
`

export const BATTERY_QUERY = `
  query Battery($id: String!) {
    battery(id: $id) {
      id
      name
      manufacturer
      model
      capacityKwh
      quantity
      maxDepthOfDischargePercent
      chargeRateKw
      dischargeRateKw
      efficiencyPercent
      chemistry
      nominalVoltage
      notes
      createdAt
      updatedAt
    }
  }
`

export const BLACKOUTS_QUERY = `
  query Blackouts($startDate: String, $endDate: String) {
    blackouts(startDate: $startDate, endDate: $endDate) {
      id
      date
      intervals {
        start
        end
        durationMinutes
      }
      province
      municipality
      notes
      createdAt
      updatedAt
    }
  }
`

// ============================================================================
// Mutations
// ============================================================================

export const CREATE_PANEL_MUTATION = `
  mutation CreatePanel($input: PanelInput!) {
    createPanel(input: $input) {
      id
      name
      manufacturer
      model
      ratedPowerKw
      quantity
      strings
      createdAt
    }
  }
`

export const UPDATE_PANEL_MUTATION = `
  mutation UpdatePanel($id: String!, $input: PanelInput!) {
    updatePanel(id: $id, input: $input) {
      id
      name
      manufacturer
      model
      ratedPowerKw
      quantity
      strings
      updatedAt
    }
  }
`

export const DELETE_PANEL_MUTATION = `
  mutation DeletePanel($id: String!) {
    deletePanel(id: $id)
  }
`

export const CREATE_BATTERY_MUTATION = `
  mutation CreateBattery($input: BatteryInput!) {
    createBattery(input: $input) {
      id
      name
      manufacturer
      model
      capacityKwh
      quantity
      createdAt
    }
  }
`

export const UPDATE_BATTERY_MUTATION = `
  mutation UpdateBattery($id: String!, $input: BatteryInput!) {
    updateBattery(id: $id, input: $input) {
      id
      name
      manufacturer
      model
      capacityKwh
      quantity
      updatedAt
    }
  }
`

export const DELETE_BATTERY_MUTATION = `
  mutation DeleteBattery($id: String!) {
    deleteBattery(id: $id)
  }
`

export const CREATE_BLACKOUT_MUTATION = `
  mutation CreateBlackout($input: BlackoutInput!) {
    createBlackout(input: $input) {
      id
      date
      intervals {
        start
        end
        durationMinutes
      }
      createdAt
    }
  }
`

export const UPDATE_BLACKOUT_MUTATION = `
  mutation UpdateBlackout($id: String!, $input: BlackoutInput!) {
    updateBlackout(id: $id, input: $input) {
      id
      date
      intervals {
        start
        end
        durationMinutes
      }
      updatedAt
    }
  }
`

export const DELETE_BLACKOUT_MUTATION = `
  mutation DeleteBlackout($id: String!) {
    deleteBlackout(id: $id)
  }
`
