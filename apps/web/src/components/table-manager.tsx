"use client";

import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import type { TableRecord } from "@/lib/types";

export function TableManager({ slug, tables: initialTables }: { slug: string; tables: TableRecord[] }) {
  const [tables, setTables] = useState(initialTables);
  const [tableNumber, setTableNumber] = useState("");
  const [message, setMessage] = useState("");

  async function createTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Creating table...");
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/tables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_number: tableNumber }),
      });
      if (!response.ok) {
        setMessage("Table creation failed.");
        return;
      }
      const created = (await response.json()) as TableRecord;
      setTables((current) => [...current, created].sort((a, b) => a.table_number.localeCompare(b.table_number)));
      setTableNumber("");
      setMessage("Table created.");
    } catch {
      setMessage("Backend unavailable. Using demo data preview.");
    }
  }

  async function clearClaim(table: TableRecord) {
    setMessage(`Clearing waiter on table ${table.table_number}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/tables/${table.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_waiter_user_id: null }),
      });
      if (!response.ok) {
        setMessage("Could not clear waiter claim.");
        return;
      }
      const updated = (await response.json()) as TableRecord;
      setTables((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage("Waiter claim cleared.");
    } catch {
      setMessage("Backend unavailable. Table actions need the API.");
    }
  }

  async function deleteTable(table: TableRecord) {
    setMessage(`Deleting table ${table.table_number}...`);
    try {
      const response = await fetch(`${apiBaseUrl}/admin/${slug}/tables/${table.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setMessage("Table deletion failed.");
        return;
      }
      setTables((current) => current.filter((entry) => entry.id !== table.id));
      setMessage("Table deleted.");
    } catch {
      setMessage("Backend unavailable. Table actions need the API.");
    }
  }

  return (
    <div className="stack">
      <form className="form-card stack" onSubmit={createTable}>
        <div>
          <h3>Add a table</h3>
          <p className="muted">Each table gets a stable opaque code for QR routing, waiter claiming, and admin lookup.</p>
        </div>
        <label className="field">
          <span>Table number</span>
          <input onChange={(event) => setTableNumber(event.target.value)} value={tableNumber} />
        </label>
        <button className="button" type="submit">
          Generate QR route
        </button>
        {message ? <div className="muted">{message}</div> : null}
      </form>

      <section className="grid two">
        {tables.map((table) => (
          <article className="table-card stack" key={table.id}>
            <div className="section-header">
              <div>
                <h3>Table {table.table_number}</h3>
                <div className="muted">{table.code}</div>
              </div>
              <span className={`status-pill ${table.current_waiter_user_id ? "active" : "grace"}`}>
                {table.current_waiter_user_id ? "claimed" : "open"}
              </span>
            </div>
            <a className="chip" href={table.qr_code_url ?? "#"} target="_blank">
              {table.qr_code_url ?? "No QR route"}
            </a>
            <div className="muted">
              {table.current_waiter_name ? `Current waiter: ${table.current_waiter_name}` : "No waiter currently assigned"}
            </div>
            <div className="chip-row">
              <button className="ghost-button" disabled={!table.current_waiter_user_id} onClick={() => clearClaim(table)} type="button">
                Clear waiter
              </button>
              <button className="ghost-button" onClick={() => deleteTable(table)} type="button">
                Delete table
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
