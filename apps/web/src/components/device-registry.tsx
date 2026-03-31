"use client";

import { useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import { translatePlatform, translateStatus } from "@/lib/i18n";
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
  const { locale, t } = useI18n();

  async function createDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(t("devices.registering"));
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
        setMessage(t("devices.register_failed"));
        return;
      }
      const created = (await response.json()) as DeviceRecord;
      setDevices((current) => [created, ...current]);
      setLabel("");
      setAssignedTableId("");
      setMessage(t("devices.registered"));
    } catch {
      setMessage(t("devices.backend_unavailable"));
    }
  }

  async function updateStatus(device: DeviceRecord, status: DeviceRecord["status"]) {
    setMessage(t("devices.updating", { name: device.label }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/devices/${device.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setMessage(t("devices.update_failed"));
        return;
      }
      const updated = (await response.json()) as DeviceRecord;
      setDevices((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage(t("devices.updated"));
    } catch {
      setMessage(t("devices.backend_unavailable"));
    }
  }

  async function deleteDevice(device: DeviceRecord) {
    setMessage(t("devices.removing", { name: device.label }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/devices/${device.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage(t("devices.remove_failed"));
        return;
      }
      setDevices((current) => current.filter((entry) => entry.id !== device.id));
      setMessage(t("devices.removed"));
    } catch {
      setMessage(t("devices.backend_unavailable"));
    }
  }

  return (
    <div className="stack">
      <form className="form-card stack" onSubmit={createDevice}>
        <div>
          <h3>{t("devices.register_title")}</h3>
          <p className="muted">{t("devices.register_description")}</p>
        </div>
        <div className="grid two">
          <label className="field">
            <span>{t("devices.label")}</span>
            <input onChange={(event) => setLabel(event.target.value)} value={label} />
          </label>
          <label className="field">
            <span>{t("devices.platform")}</span>
            <select onChange={(event) => setPlatform(event.target.value)} value={platform}>
              <option value="pwa">PWA</option>
              <option value="android">Android</option>
              <option value="web">Web</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>{t("devices.assigned_table")}</span>
          <select onChange={(event) => setAssignedTableId(event.target.value)} value={assignedTableId}>
            <option value="">{t("devices.unassigned")}</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {t("common.table", { table: table.table_number })}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          {t("devices.save")}
        </button>
        {message ? <div className="muted">{message}</div> : null}
      </form>

      <section className="grid two">
        {devices.map((device) => (
          <article className="content-card stack" key={device.id}>
            <div className="inline-meta">
              <strong>{device.label}</strong>
              <span className={`status-pill ${device.status}`}>{translateStatus(locale, device.status)}</span>
            </div>
            <div className="muted">
              {translatePlatform(device.platform)} ·{" "}
              {device.assigned_table_id
                ? t("devices.assigned_to", { table: device.assigned_table_id })
                : t("devices.unassigned")}
            </div>
            <div className="chip-row">
              <button className="ghost-button" onClick={() => updateStatus(device, "active")} type="button">
                {t("devices.mark_active")}
              </button>
              <button className="ghost-button" onClick={() => updateStatus(device, "inactive")} type="button">
                {t("devices.mark_inactive")}
              </button>
              <button className="ghost-button" onClick={() => deleteDevice(device)} type="button">
                {t("staff.remove")}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
