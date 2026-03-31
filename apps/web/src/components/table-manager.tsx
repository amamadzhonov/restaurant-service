"use client";

import { useState } from "react";

import { useI18n } from "@/components/locale-provider";
import { apiBaseUrl } from "@/lib/api";
import type { TableRecord } from "@/lib/types";

export function TableManager({ slug, tables: initialTables }: { slug: string; tables: TableRecord[] }) {
  const [tables, setTables] = useState(initialTables);
  const [tableNumber, setTableNumber] = useState("");
  const [message, setMessage] = useState("");
  const { t } = useI18n();

  async function createTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(t("tables.creating"));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/tables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: tableNumber }),
      });
      if (!response.ok) {
        setMessage(t("tables.create_failed"));
        return;
      }
      const created = (await response.json()) as TableRecord;
      setTables((current) => [...current, created].sort((a, b) => a.table_number.localeCompare(b.table_number)));
      setTableNumber("");
      setMessage(t("tables.created"));
    } catch {
      setMessage(t("tables.backend_unavailable"));
    }
  }

  async function clearClaim(table: TableRecord) {
    setMessage(t("tables.clearing", { table: table.table_number }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/tables/${table.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_waiter_user_id: null }),
      });
      if (!response.ok) {
        setMessage(t("tables.clear_failed"));
        return;
      }
      const updated = (await response.json()) as TableRecord;
      setTables((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage(t("tables.cleared"));
    } catch {
      setMessage(t("tables.backend_unavailable"));
    }
  }

  async function deleteTable(table: TableRecord) {
    setMessage(t("tables.deleting", { table: table.table_number }));
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/tables/${table.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage(t("tables.delete_failed"));
        return;
      }
      setTables((current) => current.filter((entry) => entry.id !== table.id));
      setMessage(t("tables.deleted"));
    } catch {
      setMessage(t("tables.backend_unavailable"));
    }
  }

  return (
    <div className="stack">
      <form className="form-card stack" onSubmit={createTable}>
        <div>
          <h3>{t("tables.add_table")}</h3>
          <p className="muted">{t("tables.add_table_description")}</p>
        </div>
        <label className="field">
          <span>{t("tables.table_number")}</span>
          <input onChange={(event) => setTableNumber(event.target.value)} value={tableNumber} />
        </label>
        <button className="button" type="submit">
          {t("tables.generate_qr")}
        </button>
        {message ? <div className="muted">{message}</div> : null}
      </form>

      <section className="grid two">
        {tables.map((table) => (
          <article className="table-card stack" key={table.id}>
            <div className="section-header">
              <div>
                <h3>{t("common.table", { table: table.table_number })}</h3>
                <div className="muted">{table.code}</div>
              </div>
              <span className={`status-pill ${table.current_waiter_user_id ? "active" : "grace"}`}>
                {table.current_waiter_user_id ? t("tables.claimed") : t("tables.open")}
              </span>
            </div>
            <a className="chip" href={table.qr_code_url ?? "#"} target="_blank">
              {table.qr_code_url ?? t("tables.no_qr_route")}
            </a>
            <div className="muted">
              {table.current_waiter_name
                ? t("tables.current_waiter", { name: table.current_waiter_name })
                : t("tables.no_waiter")}
            </div>
            <div className="chip-row">
              <button className="ghost-button" disabled={!table.current_waiter_user_id} onClick={() => clearClaim(table)} type="button">
                {t("tables.clear_waiter")}
              </button>
              <button className="ghost-button" onClick={() => deleteTable(table)} type="button">
                {t("tables.delete_table")}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
