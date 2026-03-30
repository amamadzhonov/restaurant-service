"""role surface refinement

Revision ID: 0003_role_surface_refinement
Revises: 0002_qr_guest_ordering
Create Date: 2026-03-30 10:30:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0003_role_surface_refinement"
down_revision = "0002_qr_guest_ordering"
branch_labels = None
depends_on = None


def _table_columns(bind: sa.Connection, table_name: str) -> set[str]:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    table_columns = _table_columns(bind, "tables")

    if "current_waiter_user_id" not in table_columns:
        op.add_column("tables", sa.Column("current_waiter_user_id", sa.String(length=36), nullable=True))
        op.create_index("ix_tables_current_waiter_user_id", "tables", ["current_waiter_user_id"], unique=False)
        op.create_foreign_key(
            "fk_tables_current_waiter_user_id_users",
            "tables",
            "users",
            ["current_waiter_user_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if "claimed_at" not in table_columns:
        op.add_column("tables", sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    table_columns = _table_columns(bind, "tables")
    if "claimed_at" in table_columns:
        op.drop_column("tables", "claimed_at")
    if "current_waiter_user_id" in table_columns:
        op.drop_constraint("fk_tables_current_waiter_user_id_users", "tables", type_="foreignkey")
        op.drop_index("ix_tables_current_waiter_user_id", table_name="tables")
        op.drop_column("tables", "current_waiter_user_id")
