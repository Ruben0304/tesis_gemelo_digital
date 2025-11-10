"""
GraphQL schema using Strawberry
"""
import strawberry
from datetime import datetime
from typing import Optional


# ============================================================================
# Types
# ============================================================================

@strawberry.type
class BatteryStatus:
    """Battery status information"""
    level: float
    capacity_kwh: float
    charging: bool
    power_kw: float
    autonomy_hours: Optional[float] = None


@strawberry.type
class CurrentSolarData:
    """Current solar production and consumption"""
    production: float
    consumption: float
    battery_level: float
    efficiency: float
    timestamp: str


@strawberry.type
class TimelinePoint:
    """Solar production timeline data point"""
    hour: str
    production: float
    consumption: float
    battery_level: float


@strawberry.type
class DailyMetrics:
    """Daily accumulated metrics"""
    production_kwh: float
    consumption_kwh: float
    co2_avoided_kg: float
    grid_import_kwh: float
    grid_export_kwh: float


@strawberry.type
class EnergyFlow:
    """Energy flow distribution"""
    solar_to_load: float
    solar_to_battery: float
    solar_to_grid: float
    battery_to_load: float
    grid_to_load: float


@strawberry.type
class SolarData:
    """Complete solar system data"""
    current: CurrentSolarData
    battery: BatteryStatus
    timeline: list[TimelinePoint]
    metrics: DailyMetrics
    energy_flow: EnergyFlow


@strawberry.type
class CurrentWeather:
    """Current weather conditions"""
    temperature: float
    humidity: float
    cloud_cover: float
    solar_radiation: float
    wind_speed: float
    condition: str
    timestamp: str


@strawberry.type
class WeatherForecastDay:
    """Weather forecast for a single day"""
    date: str
    temp_max: float
    temp_min: float
    condition: str
    solar_radiation_avg: float
    precipitation_prob: float


@strawberry.type
class WeatherData:
    """Weather data with current and forecast"""
    current: CurrentWeather
    forecast: list[WeatherForecastDay]


@strawberry.type
class Alert:
    """System alert"""
    severity: str  # 'critical' | 'warning' | 'info'
    message: str
    type: str
    timestamp: str


@strawberry.type
class HourlyPrediction:
    """Hourly prediction data"""
    hour: str
    production_kwh: float
    consumption_kwh: float
    battery_level: float
    confidence: float
    has_blackout: bool
    weather_condition: str


@strawberry.type
class PredictionData:
    """24-hour predictions with alerts"""
    predictions: list[HourlyPrediction]
    alerts: list[Alert]
    summary: str


@strawberry.type
class Panel:
    """Solar panel configuration"""
    id: str
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    rated_power_kw: float
    quantity: int
    strings: int
    efficiency_percent: Optional[float] = None
    area_m2: Optional[float] = None
    tilt_degrees: Optional[float] = None
    orientation: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


@strawberry.type
class Battery:
    """Battery configuration"""
    id: str
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity_kwh: float
    quantity: int
    max_depth_of_discharge_percent: Optional[float] = None
    charge_rate_kw: Optional[float] = None
    discharge_rate_kw: Optional[float] = None
    efficiency_percent: Optional[float] = None
    chemistry: Optional[str] = None
    nominal_voltage: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


@strawberry.type
class BlackoutInterval:
    """Blackout time interval"""
    start: str
    end: str
    duration_minutes: int


@strawberry.type
class Blackout:
    """Blackout schedule"""
    id: str
    date: str
    intervals: list[BlackoutInterval]
    province: Optional[str] = None
    municipality: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


@strawberry.type
class User:
    """User information"""
    id: str
    email: str
    name: Optional[str] = None
    role: str
    created_at: str


# ============================================================================
# Queries
# ============================================================================

@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        """Test query"""
        return "Hello from Digital Twin GraphQL API!"

    @strawberry.field
    async def solar_data(self) -> Optional[SolarData]:
        """Get current solar system data"""
        # TODO: Implement resolver
        return None

    @strawberry.field
    async def weather(self) -> Optional[WeatherData]:
        """Get current weather and forecast"""
        # TODO: Implement resolver
        return None

    @strawberry.field
    async def predictions(self) -> Optional[PredictionData]:
        """Get 24-hour predictions"""
        # TODO: Implement resolver
        return None

    @strawberry.field
    async def panels(self) -> list[Panel]:
        """Get all solar panel configurations"""
        # TODO: Implement resolver
        return []

    @strawberry.field
    async def panel(self, id: str) -> Optional[Panel]:
        """Get a specific panel by ID"""
        # TODO: Implement resolver
        return None

    @strawberry.field
    async def batteries(self) -> list[Battery]:
        """Get all battery configurations"""
        # TODO: Implement resolver
        return []

    @strawberry.field
    async def battery(self, id: str) -> Optional[Battery]:
        """Get a specific battery by ID"""
        # TODO: Implement resolver
        return None

    @strawberry.field
    async def blackouts(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> list[Blackout]:
        """Get blackout schedules within date range"""
        # TODO: Implement resolver
        return []


# ============================================================================
# Mutations
# ============================================================================

@strawberry.input
class PanelInput:
    """Input for creating/updating a panel"""
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    rated_power_kw: float
    quantity: int
    strings: int
    efficiency_percent: Optional[float] = None
    area_m2: Optional[float] = None
    tilt_degrees: Optional[float] = None
    orientation: Optional[str] = None
    notes: Optional[str] = None


@strawberry.input
class BatteryInput:
    """Input for creating/updating a battery"""
    name: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    capacity_kwh: float
    quantity: int
    max_depth_of_discharge_percent: Optional[float] = None
    charge_rate_kw: Optional[float] = None
    discharge_rate_kw: Optional[float] = None
    efficiency_percent: Optional[float] = None
    chemistry: Optional[str] = None
    nominal_voltage: Optional[float] = None
    notes: Optional[str] = None


@strawberry.input
class BlackoutIntervalInput:
    """Input for blackout interval"""
    start: str
    end: str
    duration_minutes: int


@strawberry.input
class BlackoutInput:
    """Input for creating/updating a blackout"""
    date: str
    intervals: list[BlackoutIntervalInput]
    province: Optional[str] = None
    municipality: Optional[str] = None
    notes: Optional[str] = None


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_panel(self, input: PanelInput) -> Panel:
        """Create a new panel configuration"""
        # TODO: Implement mutation
        raise NotImplementedError("create_panel not implemented")

    @strawberry.mutation
    async def update_panel(self, id: str, input: PanelInput) -> Panel:
        """Update an existing panel configuration"""
        # TODO: Implement mutation
        raise NotImplementedError("update_panel not implemented")

    @strawberry.mutation
    async def delete_panel(self, id: str) -> bool:
        """Delete a panel configuration"""
        # TODO: Implement mutation
        return False

    @strawberry.mutation
    async def create_battery(self, input: BatteryInput) -> Battery:
        """Create a new battery configuration"""
        # TODO: Implement mutation
        raise NotImplementedError("create_battery not implemented")

    @strawberry.mutation
    async def update_battery(self, id: str, input: BatteryInput) -> Battery:
        """Update an existing battery configuration"""
        # TODO: Implement mutation
        raise NotImplementedError("update_battery not implemented")

    @strawberry.mutation
    async def delete_battery(self, id: str) -> bool:
        """Delete a battery configuration"""
        # TODO: Implement mutation
        return False

    @strawberry.mutation
    async def create_blackout(self, input: BlackoutInput) -> Blackout:
        """Create a new blackout schedule"""
        # TODO: Implement mutation
        raise NotImplementedError("create_blackout not implemented")

    @strawberry.mutation
    async def update_blackout(self, id: str, input: BlackoutInput) -> Blackout:
        """Update an existing blackout schedule"""
        # TODO: Implement mutation
        raise NotImplementedError("update_blackout not implemented")

    @strawberry.mutation
    async def delete_blackout(self, id: str) -> bool:
        """Delete a blackout schedule"""
        # TODO: Implement mutation
        return False


# ============================================================================
# Schema
# ============================================================================

schema = strawberry.Schema(query=Query, mutation=Mutation)
