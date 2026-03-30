"use client";

import { useMemo, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { MenuItemRecord, MenuRecord, MenuSectionRecord } from "@/lib/types";

function groupItemsBySection(items: MenuItemRecord[]) {
  return items.reduce<Record<string, MenuItemRecord[]>>((acc, item) => {
    acc[item.section_id] = acc[item.section_id] ? [...acc[item.section_id], item] : [item];
    return acc;
  }, {});
}

export function MenuStudio({
  slug,
  menus: initialMenus,
  sections: initialSections,
  items: initialItems,
}: {
  slug: string;
  menus: MenuRecord[];
  sections: MenuSectionRecord[];
  items: MenuItemRecord[];
}) {
  const [menus, setMenus] = useState(initialMenus);
  const [sections, setSections] = useState(initialSections);
  const [items, setItems] = useState(initialItems);
  const [menuName, setMenuName] = useState(initialMenus[0]?.name ?? "All Day Menu");
  const [sectionState, setSectionState] = useState({
    id: "",
    menu_id: initialMenus[0]?.id ?? "",
    name: "",
  });
  const [itemState, setItemState] = useState({
    id: "",
    menu_id: initialMenus[0]?.id ?? "",
    section_id: initialSections[0]?.id ?? "",
    name: "",
    description: "",
    price: "18.00",
    tags: "vegetarian",
    image_url: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState("");
  const itemsBySection = useMemo(() => groupItemsBySection(items), [items]);

  async function createMenu(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("Creating menu...");
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menus`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: menuName, is_active: true }),
      });
      if (!response.ok) {
        setFeedback("Menu creation failed.");
        return;
      }
      const created = (await response.json()) as MenuRecord;
      setMenus((current) => [created, ...current]);
      setSectionState((current) => ({ ...current, menu_id: created.id }));
      setItemState((current) => ({ ...current, menu_id: created.id }));
      setFeedback("Menu created.");
    } catch {
      setFeedback("Backend unavailable. Using demo data preview.");
    }
  }

  async function saveSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(sectionState.id ? "Updating section..." : "Creating section...");
    try {
      const response = await fetch(
        sectionState.id
          ? `${apiBaseUrl}/admin/${slug}/menu-sections/${sectionState.id}`
          : `${apiBaseUrl}/admin/${slug}/menu-sections`,
        {
          method: sectionState.id ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menu_id: sectionState.menu_id,
            name: sectionState.name,
            display_order:
              sectionState.id
                ? sections.find((section) => section.id === sectionState.id)?.display_order ?? sections.length + 1
                : sections.length + 1,
          }),
        },
      );
      if (!response.ok) {
        setFeedback("Section save failed.");
        return;
      }
      const saved = (await response.json()) as MenuSectionRecord;
      setSections((current) =>
        sectionState.id
          ? current.map((section) => (section.id === saved.id ? saved : section))
          : [...current, saved].sort((a, b) => a.display_order - b.display_order),
      );
      setSectionState({ id: "", menu_id: sectionState.menu_id, name: "" });
      setFeedback(sectionState.id ? "Section updated." : "Section created.");
    } catch {
      setFeedback("Backend unavailable. Using demo data preview.");
    }
  }

  async function deleteSection(section: MenuSectionRecord) {
    setFeedback(`Removing ${section.name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-sections/${section.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setFeedback("Section removal failed.");
        return;
      }
      setSections((current) => current.filter((entry) => entry.id !== section.id));
      setItems((current) => current.filter((item) => item.section_id !== section.id));
      setFeedback("Section removed.");
    } catch {
      setFeedback("Backend unavailable. Menu management needs the API.");
    }
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(itemState.id ? "Updating item..." : "Creating item...");
    try {
      const existingItem = items.find((item) => item.id === itemState.id);
      const payload = itemState.id
        ? {
            menu_id: itemState.menu_id,
            section_id: itemState.section_id,
            name: itemState.name,
            description: itemState.description || null,
            price: itemState.price,
            image_url: itemState.image_url || null,
            tags: itemState.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            is_available: existingItem?.is_available ?? true,
            is_featured: existingItem?.is_featured ?? false,
            display_order: existingItem?.display_order ?? items.length + 1,
          }
        : {
            menu_id: itemState.menu_id,
            section_id: itemState.section_id,
            name: itemState.name,
            description: itemState.description || null,
            price: itemState.price,
            image_url: itemState.image_url || null,
            tags: itemState.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            is_available: true,
            is_featured: false,
            display_order: items.length + 1,
          };
      const response = await fetch(
        itemState.id ? `${apiBaseUrl}/admin/${slug}/menu-items/${itemState.id}` : `${apiBaseUrl}/admin/${slug}/menu-items`,
        {
          method: itemState.id ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        setFeedback("Item save failed.");
        return;
      }
      let saved = (await response.json()) as MenuItemRecord;
      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);
        const imageResponse = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${saved.id}/image`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (imageResponse.ok) {
          saved = (await imageResponse.json()) as MenuItemRecord;
        }
      }

      setItems((current) =>
        itemState.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved].sort((a, b) => a.display_order - b.display_order),
      );
      setItemState({
        id: "",
        menu_id: itemState.menu_id,
        section_id: itemState.section_id,
        name: "",
        description: "",
        price: "18.00",
        tags: "",
        image_url: "",
      });
      setSelectedImage(null);
      setFeedback(itemState.id ? "Item updated." : "Item created.");
    } catch {
      setFeedback("Backend unavailable. Using demo data preview.");
    }
  }

  async function deleteItem(item: MenuItemRecord) {
    setFeedback(`Removing ${item.name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setFeedback("Item removal failed.");
        return;
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setFeedback("Item removed.");
    } catch {
      setFeedback("Backend unavailable. Menu management needs the API.");
    }
  }

  async function removeImage(item: MenuItemRecord) {
    setFeedback(`Removing image for ${item.name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${item.id}/image`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setFeedback("Image removal failed.");
        return;
      }
      const updated = (await response.json()) as MenuItemRecord;
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setFeedback("Image removed.");
    } catch {
      setFeedback("Backend unavailable. Menu management needs the API.");
    }
  }

  async function toggleItem(item: MenuItemRecord) {
    setFeedback(`Updating ${item.name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${item.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (!response.ok) {
        setFeedback("Item update failed.");
        return;
      }
      const updated = (await response.json()) as MenuItemRecord;
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setFeedback("Item updated.");
    } catch {
      setFeedback("Backend unavailable. Using demo data preview.");
    }
  }

  function startEditingSection(section: MenuSectionRecord) {
    setSectionState({ id: section.id, menu_id: section.menu_id, name: section.name });
  }

  function startEditingItem(item: MenuItemRecord) {
    setItemState({
      id: item.id,
      menu_id: item.menu_id,
      section_id: item.section_id,
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      tags: item.tags.join(", "),
      image_url: item.image_url ?? "",
    });
    setSelectedImage(null);
  }

  return (
    <div className="stack">
      <section className="grid two">
        <form className="form-card stack" onSubmit={createMenu}>
          <div>
            <h3>Create menu</h3>
            <p className="muted">Keep menu collections explicit so QR, waiter, and kitchen flows stay predictable.</p>
          </div>
          <label className="field">
            <span>Menu name</span>
            <input onChange={(event) => setMenuName(event.target.value)} value={menuName} />
          </label>
          <button className="button" type="submit">
            Save menu
          </button>
        </form>

        <form className="form-card stack" onSubmit={saveSection}>
          <div>
            <h3>{sectionState.id ? "Update section" : "Create section"}</h3>
            <p className="muted">Sections keep the QR menu scannable and the waiter workflow organized.</p>
          </div>
          <label className="field">
            <span>Attach to menu</span>
            <select
              onChange={(event) => setSectionState((current) => ({ ...current, menu_id: event.target.value }))}
              value={sectionState.menu_id}
            >
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Section name</span>
            <input
              onChange={(event) => setSectionState((current) => ({ ...current, name: event.target.value }))}
              value={sectionState.name}
            />
          </label>
          <div className="chip-row">
            <button className="button" type="submit">
              {sectionState.id ? "Update section" : "Save section"}
            </button>
            {sectionState.id ? (
              <button
                className="ghost-button"
                onClick={() => setSectionState({ id: "", menu_id: menus[0]?.id ?? "", name: "" })}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <form className="form-card stack" onSubmit={saveItem}>
        <div>
          <h3>{itemState.id ? "Update item" : "Create item"}</h3>
          <p className="muted">Tags, availability, and item photos stay first-class in the admin workflow.</p>
        </div>
        <div className="grid two">
          <label className="field">
            <span>Menu</span>
            <select
              onChange={(event) => setItemState((current) => ({ ...current, menu_id: event.target.value }))}
              value={itemState.menu_id}
            >
              {menus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Section</span>
            <select
              onChange={(event) => setItemState((current) => ({ ...current, section_id: event.target.value }))}
              value={itemState.section_id}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Name</span>
            <input
              onChange={(event) => setItemState((current) => ({ ...current, name: event.target.value }))}
              value={itemState.name}
            />
          </label>
          <label className="field">
            <span>Price</span>
            <input
              onChange={(event) => setItemState((current) => ({ ...current, price: event.target.value }))}
              value={itemState.price}
            />
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea
            onChange={(event) => setItemState((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            value={itemState.description}
          />
        </label>
        <div className="grid two">
          <label className="field">
            <span>Tags</span>
            <input
              onChange={(event) => setItemState((current) => ({ ...current, tags: event.target.value }))}
              value={itemState.tags}
            />
          </label>
          <label className="field">
            <span>Image upload</span>
            <input
              accept="image/*"
              onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
        </div>
        {itemState.image_url ? <img alt={itemState.name || "Item preview"} className="menu-item-image preview-image" src={itemState.image_url} /> : null}
        <div className="chip-row">
          <button className="button" type="submit">
            {itemState.id ? "Update item" : "Save item"}
          </button>
          {itemState.id ? (
            <button
              className="ghost-button"
              onClick={() =>
                setItemState({
                  id: "",
                  menu_id: menus[0]?.id ?? "",
                  section_id: sections[0]?.id ?? "",
                  name: "",
                  description: "",
                  price: "18.00",
                  tags: "",
                  image_url: "",
                })
              }
              type="button"
            >
              New item form
            </button>
          ) : null}
        </div>
      </form>

      <section className="content-card stack">
        <div className="section-header">
          <div>
            <h2 className="section-title">Current catalog</h2>
            <p className="section-subtitle">Edit, remove, upload photos, and toggle availability from one surface.</p>
          </div>
        </div>
        {sections.map((section) => (
          <div key={section.id}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <strong>{section.name}</strong>
                <div className="muted">Display order {section.display_order}</div>
              </div>
              <div className="chip-row">
                <button className="ghost-button" onClick={() => startEditingSection(section)} type="button">
                  Edit section
                </button>
                <button className="ghost-button" onClick={() => deleteSection(section)} type="button">
                  Delete section
                </button>
              </div>
            </div>
            <div className="menu-grid">
              {(itemsBySection[section.id] ?? []).map((item) => (
                <article className="menu-item-card stack" key={item.id}>
                  {item.image_url ? <img alt={item.name} className="menu-item-image" src={item.image_url} /> : null}
                  <div className="inline-meta">
                    <span className={`status-pill ${item.is_available ? "active" : "past_due"}`}>
                      {item.is_available ? "available" : "unavailable"}
                    </span>
                    {item.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3>{item.name}</h3>
                  <p className="muted">{item.description}</p>
                  <div className="price">${item.price}</div>
                  <div className="chip-row">
                    <button className="ghost-button" onClick={() => startEditingItem(item)} type="button">
                      Edit item
                    </button>
                    <button className="ghost-button" onClick={() => toggleItem(item)} type="button">
                      Toggle availability
                    </button>
                    <button className="ghost-button" onClick={() => deleteItem(item)} type="button">
                      Delete item
                    </button>
                    {item.image_url ? (
                      <button className="ghost-button" onClick={() => removeImage(item)} type="button">
                        Remove image
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
        {feedback ? <div className="muted">{feedback}</div> : null}
      </section>
    </div>
  );
}
