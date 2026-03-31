"use client";

import { useId, useMemo, useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { formatCurrencyForLocale, translateTag } from "@/lib/i18n";
import type { MenuItemRecord, MenuRecord, MenuSectionRecord } from "@/lib/types";

const COMMON_TAG_SUGGESTIONS = ["vegetarian", "vegan", "spicy", "seafood", "dessert", "signature", "gluten_free"];

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
  const { locale, t } = useI18n();
  const defaultMenuName = t("menu_studio.default_menu_name");
  const fileInputId = useId();
  const [menus, setMenus] = useState(initialMenus);
  const [sections, setSections] = useState(initialSections);
  const [items, setItems] = useState(initialItems);
  const [menuName, setMenuName] = useState(initialMenus[0]?.name ?? defaultMenuName);
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
    tags: "",
    image_url: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [feedback, setFeedback] = useState("");
  const itemsBySection = useMemo(() => groupItemsBySection(items), [items]);
  const activeTags = useMemo(
    () =>
      new Set(
        itemState.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    [itemState.tags],
  );

  function addSuggestedTag(tag: string) {
    setItemState((current) => {
      const nextTags = current.tags
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (nextTags.includes(tag)) {
        return current;
      }
      return {
        ...current,
        tags: [...nextTags, tag].join(", "),
      };
    });
  }

  async function createMenu(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(t("menu_studio.creating_menu"));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menus`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: menuName, is_active: true }),
      });
      if (!response.ok) {
        setFeedback(t("menu_studio.menu_create_failed"));
        return;
      }
      const created = (await response.json()) as MenuRecord;
      setMenus((current) => [created, ...current]);
      setSectionState((current) => ({ ...current, menu_id: created.id }));
      setItemState((current) => ({ ...current, menu_id: created.id }));
      setFeedback(t("menu_studio.menu_created"));
    } catch {
      setFeedback(t("menu_studio.backend_preview"));
    }
  }

  async function saveSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(sectionState.id ? t("menu_studio.updating_section") : t("menu_studio.creating_section"));
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
        setFeedback(t("menu_studio.section_save_failed"));
        return;
      }
      const saved = (await response.json()) as MenuSectionRecord;
      setSections((current) =>
        sectionState.id
          ? current.map((section) => (section.id === saved.id ? saved : section))
          : [...current, saved].sort((a, b) => a.display_order - b.display_order),
      );
      setSectionState({ id: "", menu_id: sectionState.menu_id, name: "" });
      setFeedback(sectionState.id ? t("menu_studio.section_updated") : t("menu_studio.section_created"));
    } catch {
      setFeedback(t("menu_studio.backend_preview"));
    }
  }

  async function deleteSection(section: MenuSectionRecord) {
    setFeedback(t("menu_studio.removing_section", { name: section.name }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-sections/${section.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setFeedback(t("menu_studio.section_remove_failed"));
        return;
      }
      setSections((current) => current.filter((entry) => entry.id !== section.id));
      setItems((current) => current.filter((item) => item.section_id !== section.id));
      setFeedback(t("menu_studio.section_removed"));
    } catch {
      setFeedback(t("menu_studio.backend_required"));
    }
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(itemState.id ? t("menu_studio.updating_item") : t("menu_studio.creating_item"));
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
        setFeedback(t("menu_studio.item_save_failed"));
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
      setFeedback(itemState.id ? t("menu_studio.item_updated") : t("menu_studio.item_created"));
    } catch {
      setFeedback(t("menu_studio.backend_preview"));
    }
  }

  async function deleteItem(item: MenuItemRecord) {
    setFeedback(t("menu_studio.removing_item", { name: item.name }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setFeedback(t("menu_studio.item_remove_failed"));
        return;
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setFeedback(t("menu_studio.item_removed"));
    } catch {
      setFeedback(t("menu_studio.backend_required"));
    }
  }

  async function removeImage(item: MenuItemRecord) {
    setFeedback(t("menu_studio.removing_image", { name: item.name }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${item.id}/image`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setFeedback(t("menu_studio.image_remove_failed"));
        return;
      }
      const updated = (await response.json()) as MenuItemRecord;
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setFeedback(t("menu_studio.image_removed"));
    } catch {
      setFeedback(t("menu_studio.backend_required"));
    }
  }

  async function toggleItem(item: MenuItemRecord) {
    setFeedback(t("menu_studio.updating_item"));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/menu-items/${item.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (!response.ok) {
        setFeedback(t("menu_studio.item_save_failed"));
        return;
      }
      const updated = (await response.json()) as MenuItemRecord;
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setFeedback(t("menu_studio.item_updated"));
    } catch {
      setFeedback(t("menu_studio.backend_preview"));
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
            <h3>{t("menu_studio.create_menu_title")}</h3>
            <p className="muted">{t("menu_studio.create_menu_description")}</p>
          </div>
          <label className="field">
            <span>{t("menu_studio.menu_name")}</span>
            <input onChange={(event) => setMenuName(event.target.value)} value={menuName} />
          </label>
          <button className="button" type="submit">
            {t("menu_studio.save_menu")}
          </button>
        </form>

        <form className="form-card stack" onSubmit={saveSection}>
          <div>
            <h3>{sectionState.id ? t("menu_studio.update_section_title") : t("menu_studio.create_section_title")}</h3>
            <p className="muted">{t("menu_studio.section_description")}</p>
          </div>
          <label className="field">
            <span>{t("menu_studio.attach_to_menu")}</span>
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
            <span>{t("menu_studio.section_name")}</span>
            <input
              onChange={(event) => setSectionState((current) => ({ ...current, name: event.target.value }))}
              value={sectionState.name}
            />
          </label>
          <div className="chip-row">
            <button className="button" type="submit">
              {sectionState.id ? t("menu_studio.update_section") : t("menu_studio.save_section")}
            </button>
            {sectionState.id ? (
              <button
                className="ghost-button"
                onClick={() => setSectionState({ id: "", menu_id: menus[0]?.id ?? "", name: "" })}
                type="button"
              >
                {t("menu_studio.cancel")}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <form className="form-card stack" onSubmit={saveItem}>
        <div>
          <h3>{itemState.id ? t("menu_studio.update_item_title") : t("menu_studio.create_item_title")}</h3>
          <p className="muted">{t("menu_studio.item_description")}</p>
        </div>
        <div className="grid two">
          <label className="field">
            <span>{t("menu_studio.menu_label")}</span>
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
            <span>{t("menu_studio.section_label")}</span>
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
            <span>{t("menu_studio.item_name")}</span>
            <input
              onChange={(event) => setItemState((current) => ({ ...current, name: event.target.value }))}
              value={itemState.name}
            />
          </label>
          <label className="field">
            <span>{t("menu_studio.item_price")}</span>
            <input
              onChange={(event) => setItemState((current) => ({ ...current, price: event.target.value }))}
              value={itemState.price}
            />
          </label>
        </div>
        <label className="field">
          <span>{t("menu_studio.item_description_label")}</span>
          <textarea
            onChange={(event) => setItemState((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            value={itemState.description}
          />
        </label>
        <div className="grid two">
          <label className="field">
            <span>{t("menu_studio.item_tags")}</span>
            <input
              onChange={(event) => setItemState((current) => ({ ...current, tags: event.target.value }))}
              placeholder={t("menu_studio.item_tags_placeholder")}
              value={itemState.tags}
            />
            <span className="field-hint">{t("menu_studio.item_tags_hint")}</span>
            <div className="chip-row">
              {COMMON_TAG_SUGGESTIONS.map((tag) => (
                <button
                  aria-pressed={activeTags.has(tag)}
                  className={activeTags.has(tag) ? "ghost-button active-tag-button" : "ghost-button"}
                  key={tag}
                  onClick={() => addSuggestedTag(tag)}
                  type="button"
                >
                  {translateTag(locale, tag)}
                </button>
              ))}
            </div>
          </label>
          <label className="field">
            <span>{t("menu_studio.image_upload")}</span>
            <input
              accept="image/*"
              className="sr-only"
              id={fileInputId}
              onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
              type="file"
            />
            <div className="file-picker-row">
              <label className="ghost-button" htmlFor={fileInputId}>
                {t("menu_studio.choose_image")}
              </label>
              <span className="field-hint">
                {selectedImage
                  ? t("menu_studio.selected_image", { name: selectedImage.name })
                  : itemState.image_url
                    ? t("menu_studio.current_image_attached")
                    : t("menu_studio.no_image_selected")}
              </span>
            </div>
          </label>
        </div>
        {itemState.image_url ? (
          <img
            alt={itemState.name || t("menu_studio.item_preview")}
            className="menu-item-image preview-image"
            src={itemState.image_url}
          />
        ) : null}
        <div className="chip-row">
          <button className="button" type="submit">
            {itemState.id ? t("menu_studio.update_item") : t("menu_studio.save_item")}
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
              {t("menu_studio.new_item_form")}
            </button>
          ) : null}
        </div>
      </form>

      <section className="content-card stack">
        <div className="section-header">
          <div>
            <h2 className="section-title">{t("menu_studio.current_catalog")}</h2>
            <p className="section-subtitle">{t("menu_studio.current_catalog_description")}</p>
          </div>
        </div>
        {sections.map((section) => (
          <div key={section.id}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <strong>{section.name}</strong>
                <div className="muted">{t("menu_studio.display_order", { order: section.display_order })}</div>
              </div>
              <div className="chip-row">
                <button className="ghost-button" onClick={() => startEditingSection(section)} type="button">
                  {t("menu_studio.edit_section")}
                </button>
                <button className="ghost-button" onClick={() => deleteSection(section)} type="button">
                  {t("menu_studio.delete_section")}
                </button>
              </div>
            </div>
            <div className="menu-grid">
              {(itemsBySection[section.id] ?? []).map((item) => (
                <article className="menu-item-card stack" key={item.id}>
                  {item.image_url ? <img alt={item.name} className="menu-item-image" src={item.image_url} /> : null}
                  <div className="inline-meta">
                    <span className={`status-pill ${item.is_available ? "active" : "past_due"}`}>
                      {item.is_available ? t("common.available") : t("common.unavailable")}
                    </span>
                    {item.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {translateTag(locale, tag)}
                      </span>
                    ))}
                  </div>
                  <h3>{item.name}</h3>
                  <p className="muted">{item.description}</p>
                  <div className="price">{formatCurrencyForLocale(locale, item.price)}</div>
                  <div className="chip-row">
                    <button className="ghost-button" onClick={() => startEditingItem(item)} type="button">
                      {t("menu_studio.edit_item")}
                    </button>
                    <button className="ghost-button" onClick={() => toggleItem(item)} type="button">
                      {t("menu_studio.toggle_availability")}
                    </button>
                    <button className="ghost-button" onClick={() => deleteItem(item)} type="button">
                      {t("menu_studio.delete_item")}
                    </button>
                    {item.image_url ? (
                      <button className="ghost-button" onClick={() => removeImage(item)} type="button">
                        {t("menu_studio.remove_image")}
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
