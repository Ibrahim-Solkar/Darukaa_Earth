from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.db.base import Base

class ProjectType(str, enum.Enum):
    CARBON = "carbon"
    BIODIVERSITY = "biodiversity"
    CARBON_BIODIVERSITY = "carbon_biodiversity"

class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # NEW: Project type field
    project_type = Column(
    Enum(
        ProjectType,
        values_callable=lambda enum_cls: [member.value for member in enum_cls],
        name="projecttype",
    ),
    nullable=False,
)
    
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PLANNING, nullable=False)
    
    # NEW: Date range fields
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    
    # NEW: Area and target fields
    total_area = Column(Float, nullable=True)  # in hectares
    carbon_target = Column(Float, nullable=True)  # tons of CO2
    biodiversity_target = Column(Float, nullable=True)  # score 0-100
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (preserved)
    owner = relationship("User", back_populates="projects")
    sites = relationship("Site", back_populates="project", cascade="all, delete-orphan")