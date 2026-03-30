"use client";

import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { DeviceRecord, TableRecord } from "@/lib/types";

export function DeviceRegistry({
  slug,
  devices: initialDevices,
  tables,
}: {
  slug: string;
  devices: DeviceRecord[];
  tables: TableRecord[];
}) {
  const [devices, setDevices] = useState(initialDevices);
  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState("pwa");
  const [assignedTableId, setAssignedTableId] = useState(tables[0]?.id ?? "");
  const [message, setMessage] = useState("");

  async function createDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Registering device...");
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/devices`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          platform,
          assigned_table_id: assignedTableId || null,
          status: "active",
        }),
      });
      if (!response.ok) {
        setMessage("Device registration failed.");
        return;
      }
      const created = (await response.json()) as DeviceRecord;
      setDevices((current) => [created, ...current]);
      setLabel("");
      setAssignedTableId("");
      setMessage("Device registered.");
    } catch {
      setMessage("Backend unavailable. Using demo data preview.");
    }
  }

  async function updateStatus(device: DeviceRecord, status: DeviceRecord["status"]) {
    setMessage(`Updating ${device.label}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/devices/${device.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setMessage("Device update failed.");
        return;
      }
      const updated = (await response.json()) as DeviceRecord;
      setDevices((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage("Device updated.");
    } catch {
      setMessage("Backend unavailable. Using demo data preview.");
    }
  }

  async function deleteDevice(device: DeviceRecord) {
    setMessage(`Removing ${device.label}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/devices/${device.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Device removal failed.");
        return;
      }
      setDevices((current) => current.filter((entry) => entry.id !== device.id));
      setMessage("Device removed.");
    } catch {
      setMessage("Backend unavailable. Device actions need the API.");
    }
  }

  return (
    <div className="stack">
      <form className="form-card stack" onSubmit={createDevice}>
        <div>
          <h3>Register device</h3>
          <p className="muted">Treat tablets as assigned restaurant assets, not a heavy MDM project.</p>
        </div>
        <div className="grid two">
          <label className="field">
            <span>Label</span>
            <input onChange={(event) => setLabel(event.target.value)} value={label} />
          </label>
          <label className="field">
            <span>Platform</span>
            <select onChange={(event) => setPlatform(event.target.value)} value={platform}>
              <option value="pwa">PWA</option>
              <option value="android">Android</option>
              <option value="web">Web</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Assigned table</span>
          <select onChange={(event) => setAssignedTableId(event.target.value)} value={assignedTableId}>
            <option value="">Unassigned</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                Table {table.table_number}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          Save device
        </button>
        {message ? <div className="muted">{message}</div> : null}
      </form>

      <section className="grid two">
        {devices.map((device) => (
          <article className="content-card stack" key={device.id}>
            <div className="inline-meta">
              <strong>{device.label}</strong>
              <span className={`status-pill ${device.status}`}>{device.status}</span>
            </div>
            <div className="muted">
              {device.platform} · {device.assigned_table_id ? `Assigned to ${device.assigned_table_id}` : "Unassigned"}
            </div>
            <div className="chip-row">
              <button className="ghost-button" onClick={() => updateStatus(device, "active")} type="button">
                Mark active
              </button>
              <button className="ghost-button" onClick={() => updateStatus(device, "inactive")} type="button">
                Mark inactive
              </button>
              <button className="ghost-button" onClick={() => deleteDevice(device)} type="button">
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
