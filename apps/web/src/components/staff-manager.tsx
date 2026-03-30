"use client";

import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";
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

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Creating user...");
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, is_active: true }),
      });
      if (!response.ok) {
        setMessage("User creation failed.");
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
      setMessage("User created.");
    } catch {
      setMessage("Backend unavailable. User management needs the API.");
    }
  }

  async function patchUser(user: StaffAccountRecord, updates: Partial<StaffAccountRecord>) {
    setMessage(`Updating ${user.full_name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/users/${user.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        setMessage("User update failed.");
        return;
      }
      const updated = (await response.json()) as StaffAccountRecord;
      setStaff((current) => current.map((member) => (member.id === updated.id ? updated : member)));
      setMessage("User updated.");
    } catch {
      setMessage("Backend unavailable. User management needs the API.");
    }
  }

  async function deleteUser(user: StaffAccountRecord) {
    setMessage(`Removing ${user.full_name}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("User removal failed.");
        return;
      }
      setStaff((current) => current.filter((member) => member.id !== user.id));
      setMessage("User removed.");
    } catch {
      setMessage("Backend unavailable. User management needs the API.");
    }
  }

  return (
    <div className="stack">
      <form className="form-card stack" onSubmit={createStaff}>
        <div>
          <h3>Add a user</h3>
          <p className="muted">Restaurant admins can manage admin, waiter, and kitchen accounts inside their own tenant.</p>
        </div>
        <div className="grid two">
          <label className="field">
            <span>Full name</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              value={form.full_name}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as ManagedRole }))}
              value={form.role}
            >
              <option value="admin">Admin</option>
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </label>
        </div>
        <button className="button" type="submit">
          Create user
        </button>
        {message ? <div className="muted">{message}</div> : null}
      </form>

      <section className="grid two">
        {staff.map((member) => (
          <article className="content-card stack" key={member.id}>
            <div className="inline-meta">
              <strong>{member.full_name}</strong>
              <span className={`status-pill ${member.is_active ? "active" : "cancelled"}`}>
                {member.is_active ? "active" : "inactive"}
              </span>
            </div>
            <div className="muted">{member.email}</div>
            <label className="field">
              <span>Role</span>
              <select
                onChange={(event) => patchUser(member, { role: event.target.value as ManagedRole })}
                value={member.role}
              >
                <option value="admin">Admin</option>
                <option value="waiter">Waiter</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </label>
            <div className="chip-row">
              <button className="ghost-button" onClick={() => patchUser(member, { is_active: !member.is_active })} type="button">
                {member.is_active ? "Disable" : "Enable"}
              </button>
              <button className="ghost-button" onClick={() => deleteUser(member)} type="button">
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
