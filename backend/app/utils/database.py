"""
Database Configuration and Session Management
Purpose: SQLAlchemy setup, session management, and database utilities
"""

import os
import logging
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator, Optional

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./iot_keygen.db")

# SQLAlchemy engine configuration
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Get database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_schema():
    """Add new columns to existing tables without Alembic."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if 'users' in tables:
            columns = [col['name'] for col in inspector.get_columns('users')]
            if 'role' not in columns:
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))
                    conn.commit()
                logger.info("Migrated: added 'role' column to users table")
    except Exception as e:
        logger.warning(f"Schema migration warning (non-fatal): {e}")


def init_db():
    """Initialize database — create all tables and run migrations."""
    from app.models.models import Base
    Base.metadata.create_all(bind=engine)
    _migrate_schema()


def create_superadmin():
    """Create the superadmin account on first startup if it does not exist."""
    from app.models.models import User
    from app.auth.auth import PasswordHelper

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "superadmin").first()
        if not existing:
            superadmin = User(
                username="superadmin",
                email="admin@iot.com",
                hashed_password=PasswordHelper.hash_password("Admin123"),
                full_name="Super Administrator",
                is_active=True,
                is_admin=True,
                role="admin",
            )
            db.add(superadmin)
            db.commit()
            logger.info("Superadmin account created (username: superadmin, password: Admin123)")
        else:
            # Ensure existing superadmin has correct flags (idempotent)
            changed = False
            if not existing.is_admin:
                existing.is_admin = True
                changed = True
            if getattr(existing, 'role', None) != 'admin':
                existing.role = 'admin'
                changed = True
            if changed:
                db.commit()
    except Exception as e:
        logger.error(f"Failed to create superadmin: {e}")
        db.rollback()
    finally:
        db.close()


def log_action(
    db: Session,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    action: str = "",
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
):
    """Write an audit log entry. Non-fatal — silently swallows errors."""
    from app.models.models import AuditLog
    try:
        entry = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            details=details,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.warning(f"Audit log write failed (non-fatal): {e}")
        try:
            db.rollback()
        except Exception:
            pass


def drop_all_tables():
    """Drop all tables — USE WITH CAUTION!"""
    from app.models.models import Base
    Base.metadata.drop_all(bind=engine)
