from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.project import Project, ProjectStatus, ProjectType
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.api.auth import get_current_user
from app.api.deps import get_current_admin_user
from app.models.user import User

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_admin_user),  # ADMIN ONLY
    db: Session = Depends(get_db)
):
    """
    Create a new project. Admin only.
    """
    # Validate project_type
    try:
        project_type_enum = ProjectType(project_in.project_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid project_type. Must be one of: {[e.value for e in ProjectType]}"
        )
    
    # Validate status
    try:
        status_enum = ProjectStatus(project_in.status) if project_in.status else ProjectStatus.PLANNING
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {[e.value for e in ProjectStatus]}"
        )
    
    db_project = Project(
        name=project_in.name,
        description=project_in.description,
        project_type=project_type_enum,
        status=status_enum,
        start_date=project_in.start_date,
        end_date=project_in.end_date,
        total_area=project_in.total_area,
        carbon_target=project_in.carbon_target,
        biodiversity_target=project_in.biodiversity_target,
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("/", response_model=list[ProjectResponse])
def get_projects(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),  # AUTHENTICATED USERS
    db: Session = Depends(get_db)
):
    """
    List all projects. Authenticated users only.
    """
    return db.query(Project).offset(skip).limit(limit).all()

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),  # AUTHENTICATED USERS
    db: Session = Depends(get_db)
):
    """
    Get a single project by ID. Authenticated users only.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_admin_user),  # ADMIN ONLY
    db: Session = Depends(get_db)
):
    """
    Update a project. Admin only.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields that were provided
    update_data = project_in.model_dump(exclude_unset=True)
    
    # Validate and convert enums if provided
    if "project_type" in update_data and update_data["project_type"]:
        try:
            update_data["project_type"] = ProjectType(update_data["project_type"])
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid project_type. Must be one of: {[e.value for e in ProjectType]}"
            )
    
    if "status" in update_data and update_data["status"]:
        try:
            update_data["status"] = ProjectStatus(update_data["status"])
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {[e.value for e in ProjectStatus]}"
            )
    
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_admin_user),  # ADMIN ONLY
    db: Session = Depends(get_db)
):
    """
    Delete a project. Admin only.
    Cascades to delete all associated sites.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return None