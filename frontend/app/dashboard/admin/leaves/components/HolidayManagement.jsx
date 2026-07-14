'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, X } from 'lucide-react';
import { attendanceAPI } from '@/lib/api';
import { toast } from 'sonner';

const emptyForm = () => ({ name: '', date: '', description: '', isRecurring: false });
const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export default function HolidayManagement() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const data = await attendanceAPI.getHolidays(year);
      setHolidays(Array.isArray(data) ? data : (data?.holidays || data?.data || []));
    } catch (error) {
      toast.error(error.message || 'Failed to load holidays');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const submitHoliday = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.date) {
      toast.error('Holiday name and date are required');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await attendanceAPI.updateHoliday(editingId, form);
        toast.success('Holiday updated');
      } else {
        await attendanceAPI.createHoliday(form);
        toast.success('Holiday added');
      }
      resetForm();
      await loadHolidays();
    } catch (error) {
      toast.error(error.message || 'Failed to save holiday');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (holiday) => {
    setEditingId(holiday.id);
    setForm({
      name: holiday.name || '',
      date: dateValue(holiday.date),
      description: holiday.description || '',
      isRecurring: Boolean(holiday.isRecurring),
    });
  };

  const removeHoliday = async (holiday) => {
    if (!window.confirm(`Delete ${holiday.name}? Leave and forecast blocking will stop for this holiday.`)) return;
    try {
      await attendanceAPI.deleteHoliday(holiday.id);
      toast.success('Holiday deleted');
      if (editingId === holiday.id) resetForm();
      await loadHolidays();
    } catch (error) {
      toast.error(error.message || 'Failed to delete holiday');
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-info/15 p-2.5 text-info"><CalendarDays size={22} /></div>
          <div>
            <h2 className="font-semibold">Holiday Calendar</h2>
            <p className="text-sm text-muted-foreground">Leave applications and forecasts are blocked on configured holidays.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Year
          <input
            type="number"
            min="2000"
            max="2200"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)]">
        <form onSubmit={submitHoliday} className="space-y-4 rounded-xl border border-border bg-background/40 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{editingId ? 'Edit holiday' : 'Add holiday'}</h3>
            {editingId && <button type="button" onClick={resetForm} aria-label="Cancel editing" className="text-muted-foreground hover:text-foreground"><X size={18} /></button>}
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Holiday name</span>
            <input required maxLength={150} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Independence Day" className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 outline-none focus:border-primary" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Date</span>
            <input required type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground [color-scheme:dark] outline-none focus:border-primary" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Description <span className="text-muted-foreground">(optional)</span></span>
            <textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 outline-none focus:border-primary" />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.isRecurring} onChange={(event) => setForm((current) => ({ ...current, isRecurring: event.target.checked }))} className="h-4 w-4 accent-primary" />
            Repeat every year
          </label>
          <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
            <Plus size={18} /> {saving ? 'Saving...' : (editingId ? 'Update holiday' : 'Add holiday')}
          </button>
        </form>

        <div className="min-w-0">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <CalendarDays size={34} className="mb-3 text-muted-foreground" />
              <p className="font-medium">No holidays configured for {year}</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a holiday to block leave applications and forecasting.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{holiday.name}</p>
                      {holiday.isRecurring && <span className="rounded-full bg-info/15 px-2 py-0.5 text-xs text-info">Annual</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(holiday.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                    {holiday.description && <p className="mt-1 truncate text-xs text-muted-foreground">{holiday.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => startEdit(holiday)} aria-label={`Edit ${holiday.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={16} /></button>
                    <button onClick={() => removeHoliday(holiday)} aria-label={`Delete ${holiday.name}`} className="rounded-lg p-2 text-destructive hover:bg-destructive/10"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
