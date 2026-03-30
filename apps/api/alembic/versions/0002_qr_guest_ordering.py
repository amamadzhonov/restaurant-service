"""qr guest ordering and platform operations

Revision ID: 0002_qr_guest_ordering
Revises: 0001_initial
Create Date: 2026-03-30 01:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0002_qr_guest_ordering"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _enum_labels(bind: sa.Connection, type_name: str) -> set[str]:
    rows = bind.execute(
        sa.text(
            """
            SELECT e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = :type_name
            """
        ),
        {"type_name": type_name},
    )
    return {row[0] for row in rows}


def _table_columns(bind: sa.Connection, table_name: str) -> set[str]:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _rename_enum_value(bind: sa.Connection, type_name: str, old_label: str, new_label: str) -> None:
    if old_label in _enum_labels(bind, type_name):
        op.execute(f"ALTER TYPE {type_name} RENAME VALUE '{old_label}' TO '{new_label}'")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    _rename_enum_value(bind, "userrole", "platform_admin", "SUPER_ADMIN")
    _rename_enum_value(bind, "userrole", "PLATFORM_ADMIN", "SUPER_ADMIN")
    _rename_enum_value(bind, "userrole", "admin", "ADMIN")
    _rename_enum_value(bind, "userrole", "waiter", "WAITER")
    _rename_enum_value(bind, "userrole", "staff", "WAITER")
    _rename_enum_value(bind, "userrole", "STAFF", "WAITER")
    if "userrole" in {row[0] for row in bind.execute(sa.text("SELECT typname FROM pg_type"))}:
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'KITCHEN'")

    _rename_enum_value(bind, "orderstatus", "pending", "PLACED")
    _rename_enum_value(bind, "orderstatus", "PENDING", "PLACED")
    _rename_enum_value(bind, "orderstatus", "preparing", "PREPARING")
    _rename_enum_value(bind, "orderstatus", "ready", "READY")
    _rename_enum_value(bind, "orderstatus", "served", "SERVED")
    _rename_enum_value(bind, "orderstatus", "closed", "CLOSED")
    _rename_enum_value(bind, "orderstatus", "cancelled", "CANCELLED")
    if "orderstatus" in {row[0] for row in bind.execute(sa.text("SELECT typname FROM pg_type"))}:
        op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'READY'")

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ordersource') THEN
                CREATE TYPE ordersource AS ENUM ('QR_GUEST', 'STAFF_ASSISTED');
            END IF;
        END$$;
        """
    )

    if "tenants" in tables:
        tenant_columns = _table_columns(bind, "tenants")
        if "is_accessible" not in tenant_columns:
            op.execute("ALTER TABLE tenants ADD COLUMN is_accessible BOOLEAN DEFAULT TRUE")
            op.execute("UPDATE tenants SET is_accessible = TRUE WHERE is_accessible IS NULL")
            op.execute("ALTER TABLE tenants ALTER COLUMN is_accessible SET NOT NULL")

    if "orders" in tables:
        order_columns = _table_columns(bind, "orders")
        if "served_by_user_id" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN served_by_user_id VARCHAR(36)")
        if "closed_by_user_id" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN closed_by_user_id VARCHAR(36)")
        if "source" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN source ordersource")
            op.execute("UPDATE orders SET source = 'STAFF_ASSISTED' WHERE source IS NULL")
        if "guest_name" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN guest_name VARCHAR(255)")
        if "public_status_token" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN public_status_token VARCHAR(64)")
            op.execute("UPDATE orders SET public_status_token = CONCAT('legacy-', id) WHERE public_status_token IS NULL")
        if "placed_at" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN placed_at TIMESTAMPTZ")
            op.execute("UPDATE orders SET placed_at = created_at WHERE placed_at IS NULL")
        if "ready_at" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN ready_at TIMESTAMPTZ")
            op.execute(
                """
                UPDATE orders
                SET ready_at = status_changed_at
                WHERE ready_at IS NULL AND status IN ('SERVED', 'CLOSED')
                """
            )
        if "served_at" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN served_at TIMESTAMPTZ")
            op.execute(
                """
                UPDATE orders
                SET served_at = status_changed_at
                WHERE served_at IS NULL AND status IN ('SERVED', 'CLOSED')
                """
            )
        if "closed_at" not in order_columns:
            op.execute("ALTER TABLE orders ADD COLUMN closed_at TIMESTAMPTZ")
            op.execute("UPDATE orders SET closed_at = status_changed_at WHERE closed_at IS NULL AND status = 'CLOSED'")

        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_orders_public_status_token ON orders (public_status_token)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_orders_source ON orders (source)")

    if "password_reset_tokens" not in tables:
        op.execute(
            """
            CREATE TABLE password_reset_tokens (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id VARCHAR(36) REFERENCES tenants (id) ON DELETE CASCADE,
                user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                requested_by_user_id VARCHAR(36) REFERENCES users (id) ON DELETE SET NULL,
                token VARCHAR(128) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens (user_id)")
        op.execute("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_tenant_id ON password_reset_tokens (tenant_id)")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "password_reset_tokens" in tables:
        op.execute("DROP TABLE password_reset_tokens")
