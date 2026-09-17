import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from geoalchemy2 import Geography
from geoalchemy2.shape import from_shape
from shapely.geometry import shape

from app.db.session import get_db
from app.models.site import Site
from app.models.project import Project
from app.models.user import User
from app.schemas.site import (
    SiteCreate,
    SiteUpdate,
    SiteResponse,
    SiteFeature,
    SiteFeatureCollection,
)
from app.api.auth import get_current_user
from app.api.deps import get_current_admin_user


router = APIRouter(tags=["Sites"])


def validate_and_convert_geometry(geometry_dict: dict):
    """
    Convert GeoJSON Polygon dict to Shapely geometry.
    Validates that it is a Polygon and not a MultiPolygon.
    """
    try:
        geom = shape(geometry_dict)

        if geom.geom_type != "Polygon":
            raise ValueError(
                f"Geometry must be a Polygon, got {geom.geom_type}. "
                "MultiPolygon is not supported."
            )

        if not geom.is_valid:
            raise ValueError("Polygon geometry is invalid")

        return geom

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid geometry: {str(e)}",
        )


def calculate_area_hectares(db: Session, site_id: int) -> float:
    """
    Calculate area in hectares using PostGIS ST_Area on geography.
    ST_Area returns square meters, so divide by 10,000 for hectares.
    """
    area_query = select(
        func.ST_Area(Site.geometry.cast(Geography)) / 10000.0
    ).where(Site.id == site_id)

    result = db.execute(area_query).scalar()

    return float(result) if result is not None else 0.0


def geometry_to_geojson(db: Session, site_id: int) -> dict:
    """
    Convert PostGIS geometry to GeoJSON using ST_AsGeoJSON.
    """
    geojson_str = db.execute(
        select(func.ST_AsGeoJSON(Site.geometry)).where(Site.id == site_id)
    ).scalar()

    if geojson_str:
        return json.loads(geojson_str)

    return None


def site_to_response(db: Session, site: Site) -> SiteResponse:
    """
    Convert Site ORM object to SiteResponse with GeoJSON geometry.
    """
    geometry_geojson = geometry_to_geojson(db, site.id)

    return SiteResponse(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        description=site.description,
        area_hectares=site.area_hectares,
        created_at=site.created_at,
        updated_at=site.updated_at,
        geometry=geometry_geojson,
    )


def site_to_feature(db: Session, site: Site) -> SiteFeature:
    """
    Convert Site ORM object to a GeoJSON Feature.
    """
    geometry_geojson = geometry_to_geojson(db, site.id)

    return SiteFeature(
        type="Feature",
        id=site.id,
        geometry=geometry_geojson,
        properties={
            "id": site.id,
            "project_id": site.project_id,
            "name": site.name,
            "description": site.description,
            "area_hectares": site.area_hectares,
        },
    )


# ============================================================
# PROJECT-SCOPED ROUTES
# ============================================================


@router.post(
    "/api/projects/{project_id}/sites",
    response_model=SiteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_site(
    project_id: int,
    site_in: SiteCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Create a new site under a project.
    Admin only.
    """

    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    # Validate and convert GeoJSON to Shapely
    shapely_geom = validate_and_convert_geometry(
        site_in.geometry.model_dump()
    )

    # Convert Shapely geometry to PostGIS geometry
    db_geometry = from_shape(shapely_geom, srid=4326)

    # Create site
    new_site = Site(
        project_id=project_id,
        name=site_in.name,
        description=site_in.description,
        geometry=db_geometry,
        area_hectares=0.0,
    )

    db.add(new_site)
    db.commit()
    db.refresh(new_site)

    # Calculate area using PostGIS
    area_hectares = calculate_area_hectares(db, new_site.id)

    new_site.area_hectares = area_hectares

    db.commit()
    db.refresh(new_site)

    return site_to_response(db, new_site)


@router.get(
    "/api/projects/{project_id}/sites",
    response_model=list[SiteResponse],
)
def list_sites_by_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all sites for a project.
    Authenticated users only.
    """

    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    sites = (
        db.query(Site)
        .filter(Site.project_id == project_id)
        .all()
    )

    return [site_to_response(db, site) for site in sites]


@router.get(
    "/api/projects/{project_id}/sites/geojson",
    response_model=SiteFeatureCollection,
)
def get_sites_geojson_by_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all sites for a project as a GeoJSON FeatureCollection.
    Suitable for Mapbox GL JS.
    """

    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with id {project_id} not found",
        )

    sites = (
        db.query(Site)
        .filter(Site.project_id == project_id)
        .all()
    )

    features = [site_to_feature(db, site) for site in sites]

    return SiteFeatureCollection(
        type="FeatureCollection",
        features=features,
    )


# ============================================================
# SITE-SCOPED ROUTES
# STATIC ROUTE MUST COME BEFORE DYNAMIC ROUTES
# ============================================================


@router.get(
    "/api/sites/geojson",
    response_model=SiteFeatureCollection,
)
def get_all_sites_geojson(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all sites as a GeoJSON FeatureCollection.
    Suitable for Mapbox GL JS.
    """

    sites = db.query(Site).all()

    features = [site_to_feature(db, site) for site in sites]

    return SiteFeatureCollection(
        type="FeatureCollection",
        features=features,
    )


@router.get(
    "/api/sites/{site_id}",
    response_model=SiteResponse,
)
def get_site(
    site_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a single site by ID.
    Authenticated users only.
    """

    site = db.query(Site).filter(Site.id == site_id).first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with id {site_id} not found",
        )

    return site_to_response(db, site)


@router.put(
    "/api/sites/{site_id}",
    response_model=SiteResponse,
)
def update_site(
    site_id: int,
    site_in: SiteUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Update a site.
    Admin only.

    Can update:
    - name
    - description
    - geometry

    Cannot change project_id.
    """

    site = db.query(Site).filter(Site.id == site_id).first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with id {site_id} not found",
        )

    update_data = site_in.model_dump(exclude_unset=True)

    if "name" in update_data:
        site.name = update_data["name"]

    if "description" in update_data:
        site.description = update_data["description"]

    if "geometry" in update_data:
        shapely_geom = validate_and_convert_geometry(
            update_data["geometry"]
        )

        site.geometry = from_shape(
            shapely_geom,
            srid=4326,
        )

        # Commit geometry first so PostGIS can calculate area
        db.commit()
        db.refresh(site)

        area_hectares = calculate_area_hectares(
            db,
            site.id,
        )

        site.area_hectares = area_hectares

    db.commit()
    db.refresh(site)

    return site_to_response(db, site)


@router.delete(
    "/api/sites/{site_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_site(
    site_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Delete a site.
    Admin only.
    """

    site = db.query(Site).filter(Site.id == site_id).first()

    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site with id {site_id} not found",
        )

    db.delete(site)
    db.commit()

    return None