"use client";

import { useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { translateRole, translateStatus } from "@/lib/i18n";
import type { StaffAccountRecord } from "@/lib/types";

type ManagedRole = StaffAccountRecord["role"];

export function StaffManager({
  slug,
  initialStaff,
}: {
  slug: string;
  initialStaff: StaffAccountRecord[];
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "ChangeMe123!",
    role: "waiter" as ManagedRole,
  });
  const [message, setMessage] = useState("");
  const { locale, t } = useI18n();

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(t("staff.creating"));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_active: true }),
      });
      if (!response.ok) {
        setMessage(t("staff.create_failed"));
        return;
      }
      const created = (await response.json()) as StaffAccountRecord;
      setStaff((current) => [created, ...current]);
      setForm({
        full_name: "",
        email: "",
        password: "ChangeMe123!",
        role: "waiter",
      });
      setMessage(t("staff.created"));
    } catch {
      setMessage(t("staff.backend_unavailable"));
    }
  }

  async function patchUser(user: StaffAccountRecord, updates: Partial<StaffAccountRecord>) {
    setMessage(t("staff.updating", { name: user.full_name }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/users/${user.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        setMessage(t("staff.update_failed"));
        return;
      }
      const updated = (await response.json()) as StaffAccountRecord;
      setStaff((current) => current.map((member) => (member.id === updated.id ? updated : member)));
      setMessage(t("staff.updated"));
    } catch {
      setMessage(t("staff.backend_unavailable"));
    }
  }

  async function deleteUser(user: StaffAccountRecord) {
    setMessage(t("staff.removing", { name: user.full_name }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage(t("staff.remove_failed"));
        return;
      }
      setStaff((current) => current.filter((member) => member.id !== user.id));
      setMessage(t("staff.removed"));
    } catch {
      setMessage(t("staff.backend_unavailable"));
    }
  }

  return (
    <div className="stack">
      <form className="form-card stack" onSubmit={createStaff}>
        <div>
          <h3>{t("staff.add_user")}</h3>
          <p className="muted">{t("staff.add_user_description")}</p>
        </div>
        <div className="grid two">
          <label className="field">
            <span>{t("staff.full_name")}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              value={form.full_name}
            />
          </label>
          <label className="field">
            <span>{t("common.email")}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <label className="field">
            <span>{t("common.password")}</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password}
            />
          </label>
          <label className="field">
            <span>{t("admin.users_eyebrow")}</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as ManagedRole }))}
              value={form.role}
            >
              <option value="admin">{translateRole(locale, "admin")}</option>
              <option value="waiter">{translateRole(locale, "waiter")}</option>
              <option value="kitchen">{translateRole(locale, "kitchen")}</option>
            </select>
          </label>
        </div>
        <button className="button" type="submit">
          {t("staff.create_user")}
        </button>
        {message ? <div className="muted">{message}</div> : null}
      </form>

      <section className="grid two">
        {staff.map((member) => (
          <article className="content-card stack" key={member.id}>
            <div className="inline-meta">
              <strong>{member.full_name}</strong>
              <span className={`status-pill ${member.is_active ? "active" : "cancelled"}`}>
                {translateStatus(locale, member.is_active ? "active" : "inactive")}
              </span>
            </div>
            <div className="muted">{member.email}</div>
            <label className="field">
              <span>{t("admin.users_eyebrow")}</span>
              <select
                onChange={(event) => patchUser(member, { role: event.target.value as ManagedRole })}
                value={member.role}
              >
                <option value="admin">{translateRole(locale, "admin")}</option>
                <option value="waiter">{translateRole(locale, "waiter")}</option>
                <option value="kitchen">{translateRole(locale, "kitchen")}</option>
              </select>
            </label>
            <div className="chip-row">
              <button className="ghost-button" onClick={() => patchUser(member, { is_active: !member.is_active })} type="button">
                {member.is_active ? t("staff.disable") : t("staff.enable")}
              </button>
              <button className="ghost-button" onClick={() => deleteUser(member)} type="button">
                {t("staff.remove")}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
