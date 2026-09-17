from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field, ConfigDict, model_validator


class GeoJSONPolygon(BaseModel):
    """
    Validates GeoJSON Polygon structure.
    """

    type: str = Field(..., pattern="^Polygon$")
    coordinates: List[List[List[float]]]

    @model_validator(mode="after")
    def validate_polygon_structure(self):
        if not self.coordinates:
            raise ValueError("Polygon must have at least one linear ring")

        for ring_idx, ring in enumerate(self.coordinates):
            if len(ring) < 4:
                raise ValueError(
                    f"Linear ring {ring_idx} must have at least 4 coordinate pairs "
                    f"(got {len(ring)})"
                )

            # First and last coordinate must be identical
            if ring[0] != ring[-1]:
                raise ValueError(
                    f"Linear ring {ring_idx} is not closed "
                    f"(first coordinate must equal last)"
                )

            for coord_idx, coord in enumerate(ring):
                if len(coord) < 2:
                    raise ValueError(
                        f"Coordinate {coord_idx} in ring {ring_idx} must have "
                        f"at least 2 values [longitude, latitude]"
                    )

                lng, lat = coord[0], coord[1]

                if not (-180 <= lng <= 180):
                    raise ValueError(
                        f"Longitude {lng} at ring {ring_idx}, "
                        f"coord {coord_idx} out of range [-180, 180]"
                    )

                if not (-90 <= lat <= 90):
                    raise ValueError(
                        f"Latitude {lat} at ring {ring_idx}, "
                        f"coord {coord_idx} out of range [-90, 90]"
                    )

        return self


class SiteCreate(BaseModel):
    """Schema for creating a new site."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    geometry: GeoJSONPolygon

    model_config = ConfigDict(from_attributes=True)


class SiteUpdate(BaseModel):
    """Schema for updating a site. All fields optional."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    geometry: Optional[GeoJSONPolygon] = None

    model_config = ConfigDict(from_attributes=True)


class SiteResponse(BaseModel):
    """Schema for site response, includes geometry as GeoJSON."""

    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    area_hectares: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    geometry: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class SiteFeature(BaseModel):
    """GeoJSON Feature wrapper for a site."""

    type: str = "Feature"
    id: int
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class SiteFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection for Mapbox GL JS."""

    type: str = "FeatureCollection"
    features: List[SiteFeature]