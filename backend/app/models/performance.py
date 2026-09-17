from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Performance(Base):
    """
    Time-series performance record for a geographical site.
    Stores carbon sequestration and biodiversity metrics over time.
    """

    __tablename__ = "performance"

    id = Column(Integer, primary_key=True, index=True)

    site_id = Column(
        Integer,
        ForeignKey("sites.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recorded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    carbon_value = Column(Float, nullable=False)
    biodiversity_score = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    site = relationship(
        "Site",
        back_populates="performance_records",
    )

    __table_args__ = (
        Index(
            "ix_performance_site_recorded",
            "site_id",
            "recorded_at",
        ),
    )