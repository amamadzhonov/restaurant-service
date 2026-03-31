from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models import (
    Device,
    Menu,
    MenuItem,
    MenuSection,
    Order,
    OrderItem,
    OrderSource,
    OrderStatus,
    Subscription,
    SubscriptionStatus,
    Table,
    Tenant,
    User,
    UserRole,
)


SEED_PASSWORD = "ChangeMe123!"


async def _find_user(db: AsyncSession, emails: list[str]) -> User | None:
    result = await db.execute(select(User).where(User.email.in_(emails)))
    return result.scalars().first()


async def _upsert_user(
    db: AsyncSession,
    *,
    emails: list[str],
    preferred_email: str,
    tenant_id: str | None,
    role: UserRole,
    full_name: str,
) -> User:
    user = await _find_user(db, emails)
    if user is None:
        user = User(
            tenant_id=tenant_id,
            role=role,
            email=preferred_email,
            full_name=full_name,
            password_hash=get_password_hash(SEED_PASSWORD),
            is_active=True,
        )
        db.add(user)
        await db.flush()
        return user

    user.tenant_id = tenant_id
    user.role = role
    user.email = preferred_email
    user.full_name = full_name
    user.password_hash = get_password_hash(SEED_PASSWORD)
    user.is_active = True
    await db.flush()
    return user


async def seed_demo_data(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    demo_slug = "harbor-bistro"
    tenant_result = await db.execute(select(Tenant).where(Tenant.slug == demo_slug))
    tenant = tenant_result.scalar_one_or_none()
    if tenant is None:
        tenant = Tenant(
            name="Harbor Bistro",
            slug=demo_slug,
            address="12 River Walk, Brooklyn, NY",
            timezone="Asia/Dushanbe",
            currency="TJS",
            hero_title="Scan, order, and keep service moving",
            hero_subtitle="Guest QR ordering up front, kitchen tickets in motion, and waiters closing the table.",
            primary_color="#B24C2B",
            accent_color="#183B4E",
            subscription_plan="starter",
            subscription_status=SubscriptionStatus.ACTIVE,
            is_accessible=True,
        )
        db.add(tenant)
        await db.flush()
    else:
        tenant.name = "Harbor Bistro"
        tenant.address = "12 River Walk, Brooklyn, NY"
        tenant.hero_title = "Scan, order, and keep service moving"
        tenant.hero_subtitle = "Guest QR ordering up front, kitchen tickets in motion, and waiters closing the table."
        tenant.timezone = "Asia/Dushanbe"
        tenant.currency = "TJS"
        tenant.primary_color = "#B24C2B"
        tenant.accent_color = "#183B4E"
        tenant.subscription_plan = "starter"
        tenant.subscription_status = SubscriptionStatus.ACTIVE
        tenant.is_accessible = True

    await _upsert_user(
        db,
        emails=["owner@platform.local"],
        preferred_email="owner@platform.local",
        tenant_id=None,
        role=UserRole.SUPER_ADMIN,
        full_name="Platform Owner",
    )
    await _upsert_user(
        db,
        emails=["admin@harbor.local"],
        preferred_email="admin@harbor.local",
        tenant_id=tenant.id,
        role=UserRole.ADMIN,
        full_name="Harbor Admin",
    )
    waiter = await _upsert_user(
        db,
        emails=["waiter@harbor.local", "staff@harbor.local"],
        preferred_email="waiter@harbor.local",
        tenant_id=tenant.id,
        role=UserRole.WAITER,
        full_name="Harbor Waiter",
    )
    await _upsert_user(
        db,
        emails=["kitchen@harbor.local"],
        preferred_email="kitchen@harbor.local",
        tenant_id=tenant.id,
        role=UserRole.KITCHEN,
        full_name="Harbor Kitchen",
    )

    menu_result = await db.execute(select(Menu).where(Menu.tenant_id == tenant.id, Menu.name == "All Day Menu"))
    menu = menu_result.scalar_one_or_none()
    if menu is None:
        menu = Menu(tenant_id=tenant.id, name="All Day Menu", is_active=True)
        db.add(menu)
        await db.flush()
    else:
        menu.is_active = True

    section_defs = [("Starters", 1), ("Mains", 2), ("Drinks", 3)]
    sections: dict[str, MenuSection] = {}
    for name, display_order in section_defs:
        result = await db.execute(
            select(MenuSection).where(
                MenuSection.tenant_id == tenant.id,
                MenuSection.menu_id == menu.id,
                MenuSection.name == name,
            )
        )
        section = result.scalar_one_or_none()
        if section is None:
            section = MenuSection(
                tenant_id=tenant.id,
                menu_id=menu.id,
                name=name,
                display_order=display_order,
            )
            db.add(section)
            await db.flush()
        else:
            section.display_order = display_order
        sections[name] = section

    item_defs = [
        {
            "name": "Charred Octopus",
            "section": "Starters",
            "description": "Smoked paprika, citrus oil, and fennel crunch.",
            "price": 18,
            "tags": ["gluten_free"],
            "is_featured": True,
            "display_order": 1,
        },
        {
            "name": "Harbor Burger",
            "section": "Mains",
            "description": "Double patty, caramelized onion, and sea salt fries.",
            "price": 24,
            "tags": [],
            "is_featured": False,
            "display_order": 1,
        },
        {
            "name": "Roasted Cauliflower Steak",
            "section": "Mains",
            "description": "Tahini, green herb salsa, and toasted almonds.",
            "price": 21,
            "tags": ["vegetarian"],
            "is_featured": False,
            "display_order": 2,
        },
        {
            "name": "Spiced Citrus Spritz",
            "section": "Drinks",
            "description": "House cordial, sparkling water, orange peel.",
            "price": 11,
            "tags": ["vegan"],
            "is_featured": False,
            "display_order": 1,
        },
    ]
    created_items: dict[str, MenuItem] = {}
    for item_def in item_defs:
        result = await db.execute(
            select(MenuItem).where(MenuItem.tenant_id == tenant.id, MenuItem.name == item_def["name"])
        )
        item = result.scalar_one_or_none()
        if item is None:
            item = MenuItem(
                tenant_id=tenant.id,
                menu_id=menu.id,
                section_id=sections[item_def["section"]].id,
                name=item_def["name"],
                description=item_def["description"],
                price=item_def["price"],
                tags=item_def["tags"],
                is_featured=item_def["is_featured"],
                display_order=item_def["display_order"],
                is_available=True,
            )
            db.add(item)
            await db.flush()
        else:
            item.menu_id = menu.id
            item.section_id = sections[item_def["section"]].id
            item.description = item_def["description"]
            item.price = item_def["price"]
            item.tags = item_def["tags"]
            item.is_featured = item_def["is_featured"]
            item.display_order = item_def["display_order"]
            item.is_available = True
        created_items[item.name] = item

    table_defs = [("A1", "table-a1"), ("A2", "table-a2"), ("B4", "table-b4")]
    tables: dict[str, Table] = {}
    for table_number, code in table_defs:
        result = await db.execute(select(Table).where(Table.code == code))
        table = result.scalar_one_or_none()
        if table is None:
            table = Table(
                tenant_id=tenant.id,
                table_number=table_number,
                code=code,
                qr_code_url=f"http://localhost:3000/r/{demo_slug}/t/{code}",
            )
            db.add(table)
            await db.flush()
        else:
            table.tenant_id = tenant.id
            table.table_number = table_number
            table.qr_code_url = f"http://localhost:3000/r/{demo_slug}/t/{code}"
        if table_number in {"A1", "A2"}:
            table.current_waiter_user_id = waiter.id
            table.claimed_at = now
        else:
            table.current_waiter_user_id = None
            table.claimed_at = None
        tables[table_number] = table

    device_result = await db.execute(select(Device).where(Device.tenant_id == tenant.id, Device.label == "Front Tablet"))
    device = device_result.scalar_one_or_none()
    if device is None:
        device = Device(tenant_id=tenant.id, label="Front Tablet", platform="pwa", assigned_table_id=tables["A1"].id)
        db.add(device)
    else:
        device.platform = "pwa"
        device.assigned_table_id = tables["A1"].id

    subscription_result = await db.execute(select(Subscription).where(Subscription.tenant_id == tenant.id))
    subscription = subscription_result.scalars().first()
    if subscription is None:
        subscription = Subscription(
            tenant_id=tenant.id,
            plan="starter",
            status=SubscriptionStatus.ACTIVE,
            start_date=now,
        )
        db.add(subscription)
    else:
        subscription.plan = "starter"
        subscription.status = SubscriptionStatus.ACTIVE

    order_result = await db.execute(select(Order).where(Order.tenant_id == tenant.id))
    if order_result.scalars().first() is None:
        order_1 = Order(
            tenant_id=tenant.id,
            table_id=tables["A1"].id,
            source=OrderSource.QR_GUEST,
            guest_name="Maya",
            public_status_token="demo-maya-order",
            status=OrderStatus.PLACED,
            notes="No onions on the burger",
            total_price=35,
        )
        order_2 = Order(
            tenant_id=tenant.id,
            table_id=tables["A2"].id,
            created_by_user_id=waiter.id,
            source=OrderSource.STAFF_ASSISTED,
            guest_name="Table A2",
            public_status_token="demo-a2-order",
            status=OrderStatus.READY,
            notes="Spritz first, mains to follow",
            total_price=32,
            ready_at=now,
        )
        db.add_all([order_1, order_2])
        await db.flush()
        db.add_all(
            [
                OrderItem(order_id=order_1.id, menu_item_id=created_items["Harbor Burger"].id, quantity=1, price=24),
                OrderItem(order_id=order_1.id, menu_item_id=created_items["Spiced Citrus Spritz"].id, quantity=1, price=11),
                OrderItem(
                    order_id=order_2.id,
                    menu_item_id=created_items["Roasted Cauliflower Steak"].id,
                    quantity=1,
                    price=21,
                ),
                OrderItem(order_id=order_2.id, menu_item_id=created_items["Spiced Citrus Spritz"].id, quantity=1, price=11),
            ]
        )

    extra_tenants = [
        {
            "name": "Meadow Grill",
            "slug": "meadow-grill",
            "address": "48 Orchard Lane, Queens, NY",
            "subscription_plan": "growth",
            "subscription_status": SubscriptionStatus.ACTIVE,
            "is_accessible": True,
            "admin_email": "admin@meadow.local",
            "admin_name": "Meadow Admin",
            "device_label": "Meadow Host Tablet",
        },
        {
            "name": "Slate Room",
            "slug": "slate-room",
            "address": "88 Stone Ave, Jersey City, NJ",
            "subscription_plan": "starter",
            "subscription_status": SubscriptionStatus.PAST_DUE,
            "is_accessible": False,
            "admin_email": "admin@slate.local",
            "admin_name": "Slate Admin",
            "device_label": "Slate Host Tablet",
        },
    ]

    for tenant_seed in extra_tenants:
        result = await db.execute(select(Tenant).where(Tenant.slug == tenant_seed["slug"]))
        extra_tenant = result.scalar_one_or_none()
        if extra_tenant is None:
            extra_tenant = Tenant(
                name=tenant_seed["name"],
                slug=tenant_seed["slug"],
                address=tenant_seed["address"],
                timezone="Asia/Dushanbe",
                subscription_plan=tenant_seed["subscription_plan"],
                subscription_status=tenant_seed["subscription_status"],
                is_accessible=tenant_seed["is_accessible"],
                hero_title=f"{tenant_seed['name']} dining room",
                hero_subtitle="Platform demo tenant for multi-restaurant operations.",
                primary_color="#183B4E",
                accent_color="#B24C2B",
            )
            db.add(extra_tenant)
            await db.flush()
        else:
            extra_tenant.name = tenant_seed["name"]
            extra_tenant.address = tenant_seed["address"]
            extra_tenant.timezone = "Asia/Dushanbe"
            extra_tenant.subscription_plan = tenant_seed["subscription_plan"]
            extra_tenant.subscription_status = tenant_seed["subscription_status"]
            extra_tenant.is_accessible = tenant_seed["is_accessible"]

        await _upsert_user(
            db,
            emails=[tenant_seed["admin_email"]],
            preferred_email=tenant_seed["admin_email"],
            tenant_id=extra_tenant.id,
            role=UserRole.ADMIN,
            full_name=tenant_seed["admin_name"],
        )

        device_result = await db.execute(
            select(Device).where(Device.tenant_id == extra_tenant.id, Device.label == tenant_seed["device_label"])
        )
        extra_device = device_result.scalar_one_or_none()
        if extra_device is None:
            db.add(
                Device(
                    tenant_id=extra_tenant.id,
                    label=tenant_seed["device_label"],
                    platform="pwa",
                )
            )

        subscription_result = await db.execute(select(Subscription).where(Subscription.tenant_id == extra_tenant.id))
        extra_subscription = subscription_result.scalars().first()
        if extra_subscription is None:
            db.add(
                Subscription(
                    tenant_id=extra_tenant.id,
                    plan=tenant_seed["subscription_plan"],
                    status=tenant_seed["subscription_status"],
                    start_date=now,
                )
            )
        else:
            extra_subscription.plan = tenant_seed["subscription_plan"]
            extra_subscription.status = tenant_seed["subscription_status"]

    await db.commit()
