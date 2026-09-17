"""
Admin Bootstrap Script

Promotes an existing user to ADMIN role.
This is a one-time CLI tool for initial hackathon setup.

Usage (from backend/ directory with venv active):
    python scripts/bootstrap_admin.py admin@darukaa.earth

Security:
    - Does NOT create new users
    - Does NOT set passwords
    - Does NOT expose admin creation via API
    - Only promotes existing authenticated users
"""
import argparse
import sys
import os

# Ensure we can import from app when running from backend directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal

# Import ALL models to ensure SQLAlchemy mappers are fully registered.
# User has relationship("Project"), which requires Project to be imported
# before any User query can execute.
from app.models.project import Project  # noqa: F401
from app.models.site import Site  # noqa: F401
from app.models.user import User, UserRole


def promote_to_admin(email: str) -> bool:
    """
    Promote a user to ADMIN role by email.

    Args:
        email: Email address of the user to promote

    Returns:
        True if successful, False otherwise
    """
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            print(f"Error: User with email '{email}' not found.")
            print("   Please register the user first via POST /api/auth/register")
            return False

        if user.role == UserRole.ADMIN:
            print(f"Info: User '{email}' is already an admin. No changes made.")
            return True

        user.role = UserRole.ADMIN
        db.commit()

        print(f"Successfully promoted '{email}' to ADMIN role.")
        print(f"   User ID: {user.id}")
        print(f"   Name: {user.name}")
        return True

    except Exception as e:
        db.rollback()
        print(f"Database error: {e}")
        return False
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Promote an existing user to admin role",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/bootstrap_admin.py admin@darukaa.earth
    python scripts/bootstrap_admin.py your-email@example.com

Note:
    - Run from the backend directory
    - Ensure virtual environment is activated
    - User must already exist (register first if needed)
        """
    )

    parser.add_argument(
        "email",
        help="Email address of the user to promote to admin"
    )

    args = parser.parse_args()

    if "@" not in args.email or "." not in args.email:
        print(f"Invalid email format: {args.email}")
        sys.exit(1)

    success = promote_to_admin(args.email)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()