from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.db.base import Base

class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # PostGIS Geometry Column: Stores POLYGON in WGS84 (SRID 4326)
    # spatial_index=True automatically creates a GiST index for fast spatial queries
    geometry = Column(Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False)
    
    # Area in hectares (can be calculated dynamically via PostGIS ST_Area, but caching it is performant)
    area_hectares = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="sites")
    performance_records = relationship(
    "Performance",
    back_populates="site",
    cascade="all, delete-orphan",
)