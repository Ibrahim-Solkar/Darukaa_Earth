from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    project_type: str = Field(..., description="carbon, biodiversity, or carbon_biodiversity")
    status: Optional[str] = "planning"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_area: Optional[float] = Field(None, ge=0, description="Area in hectares")
    carbon_target: Optional[float] = Field(None, ge=0, description="Target carbon in tons")
    biodiversity_target: Optional[float] = Field(None, ge=0, le=100, description="Target biodiversity score 0-100")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    project_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_area: Optional[float] = Field(None, ge=0)
    carbon_target: Optional[float] = Field(None, ge=0)
    biodiversity_target: Optional[float] = Field(None, ge=0, le=100)

class ProjectResponse(ProjectBase):
    id: int
    owner_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)