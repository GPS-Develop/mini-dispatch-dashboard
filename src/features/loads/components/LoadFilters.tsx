"use client";
import { Driver } from "../../drivers/DriverContext";

interface LoadFiltersProps {
  search: string;
  setSearch: (search: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  driverFilter: string;
  setDriverFilter: (driver: string) => void;
  drivers: Driver[];
}

const statusOptions = ["All", "Scheduled", "In-Transit", "Delivered"];

export function LoadFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  driverFilter,
  setDriverFilter,
  drivers
}: LoadFiltersProps) {
  return (
    <div className="filters-section">
      <input
        type="text"
        placeholder="Search by Load ID or location"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field filter-input"
        aria-label="Search loads by ID or location"
      />
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="input-field filter-input"
        aria-label="Filter by load status"
      >
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={driverFilter}
        onChange={(e) => setDriverFilter(e.target.value)}
        className="input-field filter-input"
        aria-label="Filter by driver"
      >
        <option value="">All Drivers</option>
        {drivers.map((d) => (
          <option key={d.id} value={d.name}>{d.name}</option>
        ))}
      </select>
    </div>
  );
}