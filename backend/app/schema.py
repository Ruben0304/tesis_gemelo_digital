"""
GraphQL schema exposing the migrated Digital Twin functionality.
"""
from __future__ import annotations

from typing import List, Optional

import strawberry

from app.services.battery_service import (
    create_battery,
    delete_battery,
    get_battery,
    list_batteries,
    update_battery,
)
from app.services.blackout_service import (
    delete_blackout,
    get_blackout,
    list_blackouts,
    save_blackout_schedule,
    update_blackout_schedule,
)
from app.services.panel_service import (
    create_panel,
    delete_panel,
    get_panel,
    list_panels,
    update_panel,
)
from app.services.prediction_service import get_predictions_bundle
from app.services.solar_service import get_solar_snapshot
from app.services.system_config import get_system_config
from app.services.user_service import authenticate_user, register_user
from app.services.weather_service import get_weather_with_fallback
from app.services.ml_prediction_service import (
    predict_solar_production,
    predict_next_hours,
    predict_for_date_range,
)
from app.services.ml_model_service import ml_model_service


# ============================================================================
# Types
# ============================================================================


@strawberry.type
class SolarPoint:
    timestamp: str
    production: float
    consumption: float
    batteryLevel: float
    gridExport: float
    gridImport: float
    efficiency: float
    batteryDelta: Optional[float]


@strawberry.type
class BatteryStatusType:
    chargeLevel: float
    capacity: float
    current: float
    autonomyHours: float
    charging: bool
    powerFlow: float
    projectedMinLevel: Optional[float]
    projectedMaxLevel: Optional[float]
    note: Optional[str]


@strawberry.type
class SystemMetricsType:
    currentProduction: float
    currentConsumption: float
    energyBalance: float
    systemEfficiency: float
    dailyProduction: float
    dailyConsumption: float
    co2Avoided: float


@strawberry.type
class EnergyFlowType:
    solarToBattery: float
    solarToLoad: float
    solarToGrid: float
    batteryToLoad: float
    gridToLoad: float


@strawberry.type
class WeatherForecastDay:
    date: str
    dayOfWeek: str
    maxTemp: float
    minTemp: float
    solarRadiation: float
    cloudCover: float
    predictedProduction: float
    condition: str


@strawberry.type
class WeatherDataType:
    temperature: float
    solarRadiation: float
    cloudCover: float
    humidity: float
    windSpeed: float
    forecast: List[WeatherForecastDay]
    provider: Optional[str]
    locationName: Optional[str]
    lastUpdated: Optional[str]
    description: Optional[str]


@strawberry.type
class LocationConfigType:
    lat: float
    lon: float
    name: str


@strawberry.type
class PanelConfigSpec:
    id_: Optional[str] = strawberry.field(name="_id")
    manufacturer: Optional[str]
    model: Optional[str]
    ratedPowerKw: Optional[float]
    quantity: Optional[int]
    tiltDegrees: Optional[float]
    orientation: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]


@strawberry.type
class SolarConfigType:
    capacityKw: float
    panelRatedKw: Optional[float]
    panelCount: int
    strings: Optional[int]
    panelEfficiencyPercent: Optional[float]
    panelAreaM2: Optional[float]
    spec: Optional[PanelConfigSpec]


@strawberry.type
class BatteryConfigSpec:
    id_: Optional[str] = strawberry.field(name="_id")
    manufacturer: Optional[str]
    model: Optional[str]
    capacityKwh: Optional[float]
    quantity: Optional[int]
    createdAt: Optional[str]
    updatedAt: Optional[str]


@strawberry.type
class BatteryConfigType:
    capacityKwh: float
    moduleCapacityKwh: Optional[float]
    moduleCount: Optional[int]
    maxDepthOfDischargePercent: Optional[float]
    chargeRateKw: Optional[float]
    dischargeRateKw: Optional[float]
    efficiencyPercent: Optional[float]
    spec: Optional[BatteryConfigSpec]


@strawberry.type
class SystemConfigType:
    location: LocationConfigType
    solar: SolarConfigType
    battery: BatteryConfigType


@strawberry.type
class SolarSnapshot:
    current: SolarPoint
    historical: List[SolarPoint]
    battery: BatteryStatusType
    metrics: SystemMetricsType
    energyFlow: EnergyFlowType
    weather: WeatherDataType
    config: SystemConfigType
    timestamp: str
    mode: str


@strawberry.type
class BlackoutImpactType:
    intervalStart: str
    intervalEnd: str
    loadFactor: float
    productionFactor: float
    intensity: str
    note: Optional[str]


@strawberry.type
class PredictionType:
    timestamp: str
    hour: int
    expectedProduction: float
    expectedConsumption: float
    confidence: float
    blackoutImpact: Optional[BlackoutImpactType]


@strawberry.type
class AlertType:
    id: str
    type: str
    title: str
    message: str
    timestamp: str


@strawberry.type
class BlackoutIntervalType:
    start: str
    end: str
    durationMinutes: Optional[int]


@strawberry.type
class BlackoutType:
    id_: str = strawberry.field(name="_id")
    date: str
    intervals: List[BlackoutIntervalType]
    province: Optional[str]
    municipality: Optional[str]
    notes: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]


@strawberry.type
class PredictionsPayload:
    predictions: List[PredictionType]
    alerts: List[AlertType]
    recommendations: List[str]
    battery: BatteryStatusType
    timeline: List[SolarPoint]
    weather: WeatherDataType
    timestamp: str
    config: SystemConfigType
    blackouts: List[BlackoutType]


@strawberry.type
class PanelType:
    id_: str = strawberry.field(name="_id")
    manufacturer: str
    model: Optional[str]
    ratedPowerKw: float
    quantity: int
    tiltDegrees: Optional[float]
    orientation: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]


@strawberry.type
class BatteryType:
    id_: str = strawberry.field(name="_id")
    manufacturer: str
    model: Optional[str]
    capacityKwh: float
    quantity: int
    createdAt: Optional[str]
    updatedAt: Optional[str]


@strawberry.type
class UserType:
    _id: str
    email: str
    name: Optional[str]
    role: str
    createdAt: Optional[str]
    updatedAt: Optional[str]


@strawberry.type
class MLWeatherFeaturesType:
    temperature_2m: float
    relative_humidity_2m: float
    wind_speed_10m: float
    cloud_cover: float
    shortwave_radiation: float


@strawberry.type
class MLPredictionType:
    datetime: str
    production_kw: float
    weather: MLWeatherFeaturesType


@strawberry.type
class MLModelInfoType:
    loaded: bool
    model_name: Optional[str]
    test_rmse: Optional[float]
    test_r2: Optional[float]
    test_mae: Optional[float]
    features: List[str]
    training_date: Optional[str]
    requires_scaling: Optional[bool]
    message: Optional[str]


# ============================================================================
# Helpers
# ============================================================================


def _map_solar_point(item: dict) -> SolarPoint:
    return SolarPoint(**item)


def _map_weather(data: dict) -> WeatherDataType:
    return WeatherDataType(
        temperature=data["temperature"],
        solarRadiation=data["solarRadiation"],
        cloudCover=data["cloudCover"],
        humidity=data["humidity"],
        windSpeed=data["windSpeed"],
        forecast=[WeatherForecastDay(**day) for day in data.get("forecast", [])],
        provider=data.get("provider"),
        locationName=data.get("locationName"),
        lastUpdated=data.get("lastUpdated"),
        description=data.get("description"),
    )


def _map_battery_status(data: dict) -> BatteryStatusType:
    return BatteryStatusType(**data)


def _map_metrics(data: dict) -> SystemMetricsType:
    return SystemMetricsType(**data)


def _map_energy_flow(data: dict) -> EnergyFlowType:
    return EnergyFlowType(**data)


def _map_panel(data: dict) -> PanelType:
    # Rename _id to id_ for Strawberry field mapping
    data_copy = {**data}
    if "_id" in data_copy:
        data_copy["id_"] = data_copy.pop("_id")
    return PanelType(**data_copy)


def _map_battery(data: dict) -> BatteryType:
    # Rename _id to id_ for Strawberry field mapping
    data_copy = {**data}
    if "_id" in data_copy:
        data_copy["id_"] = data_copy.pop("_id")
    return BatteryType(**data_copy)


def _map_panel_spec(data: dict) -> PanelConfigSpec:
    # Rename _id to id_ for Strawberry field mapping
    data_copy = {**data}
    if "_id" in data_copy:
        data_copy["id_"] = data_copy.pop("_id")
    return PanelConfigSpec(**data_copy)


def _map_battery_spec(data: dict) -> BatteryConfigSpec:
    # Rename _id to id_ for Strawberry field mapping
    data_copy = {**data}
    if "_id" in data_copy:
        data_copy["id_"] = data_copy.pop("_id")
    return BatteryConfigSpec(**data_copy)


def _map_system_config(config: dict) -> SystemConfigType:
    location = LocationConfigType(**config["location"])
    solar_spec = _map_panel_spec(config["solar"]["spec"]) if config["solar"].get("spec") else None
    battery_spec = _map_battery_spec(config["battery"]["spec"]) if config["battery"].get("spec") else None
    solar = SolarConfigType(
        capacityKw=config["solar"]["capacityKw"],
        panelRatedKw=config["solar"].get("panelRatedKw"),
        panelCount=config["solar"].get("panelCount") or 0,
        strings=config["solar"].get("strings"),
        panelEfficiencyPercent=config["solar"].get("panelEfficiencyPercent"),
        panelAreaM2=config["solar"].get("panelAreaM2"),
        spec=solar_spec,
    )
    battery = BatteryConfigType(
        capacityKwh=config["battery"]["capacityKwh"],
        moduleCapacityKwh=config["battery"].get("moduleCapacityKwh"),
        moduleCount=config["battery"].get("moduleCount"),
        maxDepthOfDischargePercent=config["battery"].get("maxDepthOfDischargePercent"),
        chargeRateKw=config["battery"].get("chargeRateKw"),
        dischargeRateKw=config["battery"].get("dischargeRateKw"),
        efficiencyPercent=config["battery"].get("efficiencyPercent"),
        spec=battery_spec,
    )
    return SystemConfigType(location=location, solar=solar, battery=battery)


def _map_blackout(data: dict) -> BlackoutType:
    return BlackoutType(
        id_=data["_id"],
        date=data["date"],
        intervals=[BlackoutIntervalType(**interval) for interval in data.get("intervals", [])],
        province=data.get("province"),
        municipality=data.get("municipality"),
        notes=data.get("notes"),
        createdAt=data.get("createdAt"),
        updatedAt=data.get("updatedAt"),
    )


# ============================================================================
# Queries
# ============================================================================


@strawberry.type
class Query:
    @strawberry.field
    async def solar(self) -> SolarSnapshot:
        data = await get_solar_snapshot()
        return SolarSnapshot(
            current=_map_solar_point(data["current"]),
            historical=[_map_solar_point(item) for item in data["historical"]],
            battery=_map_battery_status(data["battery"]),
            metrics=_map_metrics(data["metrics"]),
            energyFlow=_map_energy_flow(data["energyFlow"]),
            weather=_map_weather(data["weather"]),
            config=_map_system_config(data["config"]),
            timestamp=data["timestamp"],
            mode=data["mode"],
        )

    @strawberry.field
    async def weather(self) -> WeatherDataType:
        config = get_system_config()
        weather = await get_weather_with_fallback(
            config["location"]["lat"],
            config["location"]["lon"],
            config["solar"]["capacityKw"],
            config["location"]["name"],
        )
        return _map_weather(weather)

    @strawberry.field
    async def predictions(self) -> PredictionsPayload:
        data = await get_predictions_bundle()
        return PredictionsPayload(
            predictions=[
                PredictionType(
                    **prediction,
                    blackoutImpact=BlackoutImpactType(**prediction["blackoutImpact"])
                    if prediction.get("blackoutImpact")
                    else None,
                )
                for prediction in data["predictions"]
            ],
            alerts=[AlertType(**alert) for alert in data["alerts"]],
            recommendations=data["recommendations"],
            battery=_map_battery_status(data["battery"]),
            timeline=[_map_solar_point(item) for item in data["timeline"]],
            weather=_map_weather(data["weather"]),
            timestamp=data["timestamp"],
            config=_map_system_config(data["config"]),
            blackouts=[_map_blackout(item) for item in data["blackouts"]],
        )

    @strawberry.field
    def panels(self) -> List[PanelType]:
        return [_map_panel(panel) for panel in list_panels()]

    @strawberry.field
    def panel(self, id: str) -> Optional[PanelType]:
        panel = get_panel(id)
        return _map_panel(panel) if panel else None

    @strawberry.field
    def batteries(self) -> List[BatteryType]:
        return [_map_battery(battery) for battery in list_batteries()]

    @strawberry.field
    def battery(self, id: str) -> Optional[BatteryType]:
        battery = get_battery(id)
        return _map_battery(battery) if battery else None

    @strawberry.field
    def blackouts(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[BlackoutType]:
        items = list_blackouts(start_date, end_date, limit)
        return [_map_blackout(item) for item in items]

    @strawberry.field
    async def ml_predict(
        self,
        datetimes: List[str],
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> List[MLPredictionType]:
        """
        Predict solar production using ML model for specific datetimes.

        Args:
            datetimes: List of ISO datetime strings (e.g., ["2025-01-15T13:00:00", "2025-01-15T14:00:00"])
            lat: Latitude (optional, defaults to system location)
            lon: Longitude (optional, defaults to system location)

        Returns:
            List of predictions with production_kw and weather features
        """
        # Get system config for location if not provided
        if lat is None or lon is None:
            config = get_system_config()
            lat = lat or config["location"]["lat"]
            lon = lon or config["location"]["lon"]

        predictions = await predict_solar_production(datetimes, lat, lon)

        return [
            MLPredictionType(
                datetime=pred["datetime"],
                production_kw=pred["production_kw"],
                weather=MLWeatherFeaturesType(**pred["weather"]),
            )
            for pred in predictions
        ]

    @strawberry.field
    async def ml_predict_next_hours(
        self,
        hours: int = 24,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> List[MLPredictionType]:
        """
        Predict solar production for the next N hours.

        Args:
            hours: Number of hours to predict (default: 24)
            lat: Latitude (optional, defaults to system location)
            lon: Longitude (optional, defaults to system location)

        Returns:
            List of hourly predictions
        """
        # Get system config for location if not provided
        if lat is None or lon is None:
            config = get_system_config()
            lat = lat or config["location"]["lat"]
            lon = lon or config["location"]["lon"]

        predictions = await predict_next_hours(hours, lat, lon)

        return [
            MLPredictionType(
                datetime=pred["datetime"],
                production_kw=pred["production_kw"],
                weather=MLWeatherFeaturesType(**pred["weather"]),
            )
            for pred in predictions
        ]

    @strawberry.field
    async def ml_predict_date_range(
        self,
        start_date: str,
        end_date: str,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> List[MLPredictionType]:
        """
        Predict solar production for all hours in a date range.

        Args:
            start_date: Start date (ISO format: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS')
            end_date: End date (ISO format: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SS')
            lat: Latitude (optional, defaults to system location)
            lon: Longitude (optional, defaults to system location)

        Returns:
            List of hourly predictions for the entire date range
        """
        # Get system config for location if not provided
        if lat is None or lon is None:
            config = get_system_config()
            lat = lat or config["location"]["lat"]
            lon = lon or config["location"]["lon"]

        predictions = await predict_for_date_range(start_date, end_date, lat, lon)

        return [
            MLPredictionType(
                datetime=pred["datetime"],
                production_kw=pred["production_kw"],
                weather=MLWeatherFeaturesType(**pred["weather"]),
            )
            for pred in predictions
        ]

    @strawberry.field
    async def ml_predict_for_hours(
        self,
        date: str,
        hours: List[int],
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> List[MLPredictionType]:
        """
        Predict solar production for specific hours of a given day.

        Args:
            date: Date in YYYY-MM-DD format
            hours: List of hours (0-23) to predict for (e.g., [7, 8, 9, ..., 22] for 7am-10pm)
            lat: Optional latitude (defaults to system location)
            lon: Optional longitude (defaults to system location)

        Returns:
            List of predictions with production_kw and weather features
        """
        from .services.ml_prediction_service import predict_for_specific_hours
        from .services.system_config import get_system_config

        config = get_system_config()
        latitude = lat if lat is not None else config["location"]["lat"]
        longitude = lon if lon is not None else config["location"]["lon"]

        predictions = await predict_for_specific_hours(date, hours, latitude, longitude)

        return [
            MLPredictionType(
                datetime=pred["datetime"],
                production_kw=pred["production_kw"],
                weather=MLWeatherFeaturesType(
                    temperature_2m=pred["weather"]["temperature_2m"],
                    relative_humidity_2m=pred["weather"]["relative_humidity_2m"],
                    wind_speed_10m=pred["weather"]["wind_speed_10m"],
                    cloud_cover=pred["weather"]["cloud_cover"],
                    shortwave_radiation=pred["weather"]["shortwave_radiation"],
                ),
            )
            for pred in predictions
        ]

    @strawberry.field
    def ml_model_info(self) -> MLModelInfoType:
        """
        Get information about the loaded ML model.

        Returns:
            Model metadata including accuracy metrics and status
        """
        info = ml_model_service.get_model_info()
        return MLModelInfoType(
            loaded=info.get("loaded", False),
            model_name=info.get("model_name"),
            test_rmse=info.get("test_rmse"),
            test_r2=info.get("test_r2"),
            test_mae=info.get("test_mae"),
            features=info.get("features", []),
            training_date=info.get("training_date"),
            requires_scaling=info.get("requires_scaling"),
            message=info.get("message"),
        )


# ============================================================================
# Inputs
# ============================================================================


@strawberry.input
class PanelInput:
    manufacturer: str
    model: Optional[str] = None
    ratedPowerKw: float
    quantity: int
    tiltDegrees: Optional[float] = None
    orientation: Optional[str] = None


@strawberry.input
class BatteryInput:
    manufacturer: str
    model: Optional[str] = None
    capacityKwh: float
    quantity: int


@strawberry.input
class BlackoutIntervalInput:
    start: str
    end: str


@strawberry.input
class BlackoutInput:
    date: str
    intervals: List[BlackoutIntervalInput]
    province: Optional[str] = None
    municipality: Optional[str] = None
    notes: Optional[str] = None


@strawberry.input
class RegisterInput:
    email: str
    password: str
    name: Optional[str] = None
    role: Optional[str] = None


@strawberry.input
class LoginInput:
    email: str
    password: str


# ============================================================================
# Mutations
# ============================================================================


@strawberry.type
class Mutation:
    @strawberry.mutation(name="createPanel")
    def create_panel_mutation(self, input: PanelInput) -> PanelType:
        panel = create_panel(input.__dict__)
        return _map_panel(panel)

    @strawberry.mutation(name="updatePanel")
    def update_panel_mutation(self, id: str, input: PanelInput) -> PanelType:
        panel = update_panel(id, input.__dict__)
        if not panel:
            raise ValueError("Panel no encontrado.")
        return _map_panel(panel)

    @strawberry.mutation(name="deletePanel")
    def delete_panel_mutation(self, id: str) -> bool:
        return delete_panel(id)

    @strawberry.mutation(name="createBattery")
    def create_battery_mutation(self, input: BatteryInput) -> BatteryType:
        battery = create_battery(input.__dict__)
        return _map_battery(battery)

    @strawberry.mutation(name="updateBattery")
    def update_battery_mutation(self, id: str, input: BatteryInput) -> BatteryType:
        battery = update_battery(id, input.__dict__)
        if not battery:
            raise ValueError("Batería no encontrada.")
        return _map_battery(battery)

    @strawberry.mutation(name="deleteBattery")
    def delete_battery_mutation(self, id: str) -> bool:
        return delete_battery(id)

    @strawberry.mutation(name="createBlackout")
    def create_blackout_mutation(self, input: BlackoutInput) -> BlackoutType:
        payload = {
            "date": input.date,
            "intervals": [interval.__dict__ for interval in input.intervals],
            "province": input.province,
            "municipality": input.municipality,
            "notes": input.notes,
        }
        blackout = save_blackout_schedule(payload)
        return _map_blackout(blackout)

    @strawberry.mutation(name="updateBlackout")
    def update_blackout_mutation(self, id: str, input: BlackoutInput) -> BlackoutType:
        payload = {
            "date": input.date,
            "intervals": [interval.__dict__ for interval in input.intervals],
            "province": input.province,
            "municipality": input.municipality,
            "notes": input.notes,
        }
        blackout = update_blackout_schedule(id, payload)
        return _map_blackout(blackout)

    @strawberry.mutation(name="deleteBlackout")
    def delete_blackout_mutation(self, id: str) -> bool:
        return delete_blackout(id)

    @strawberry.mutation(name="registerUser")
    def register_user_mutation(self, input: RegisterInput) -> UserType:
        user = register_user(input.__dict__)
        return UserType(**user)

    @strawberry.mutation(name="loginUser")
    def login_user_mutation(self, input: LoginInput) -> UserType:
        user = authenticate_user(input.__dict__)
        return UserType(**user)


# ============================================================================
# Schema
# ============================================================================

schema = strawberry.Schema(query=Query, mutation=Mutation)
