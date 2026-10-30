"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";

export type FieldKind = "text" | "area" | "lines" | "select" | "checkbox" | "links";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  optional?: boolean;
  placeholder?: string;
  full?: boolean;
};

const fullWidthKinds: FieldKind[] = ["area", "lines", "links"];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asLines(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asLinks(value: unknown): { label: string; href: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { label: string; href: string } =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { href?: unknown }).href === "string",
  );
}

export function Field({
  label,
  optional,
  hint,
  children,
  className,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`form-field ${className ?? ""}`}>
      <span className="form-label">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-[var(--muted)]">(optional)</span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  optional,
  placeholder,
  maxLength = 300,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <Field label={label} optional={optional} className={className}>
      <input
        id={id}
        className="form-input"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  optional,
  rows = 4,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} optional={optional}>
      <textarea
        id={id}
        className="form-input"
        rows={rows}
        style={{ minHeight: `${rows * 2.4}rem` }}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function LinesInput({
  label,
  value,
  onChange,
  optional,
  hint = "One item per line.",
  rows = 4,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  optional?: boolean;
  hint?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <Field label={label} optional={optional} hint={hint}>
      <textarea
        id={id}
        className="form-input"
        rows={rows}
        style={{ minHeight: `${rows * 2.4}rem` }}
        value={value.join("\n")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  );
}

export function LinksInput({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: { label: string; href: string }[];
  onChange: (value: { label: string; href: string }[]) => void;
  optional?: boolean;
}) {
  const id = useId();
  return (
    <Field
      label={label}
      optional={optional}
      hint="One link per line as: Label | https://example.com"
    >
      <textarea
        id={id}
        className="form-input"
        rows={3}
        value={value.map((link) => `${link.label} | ${link.href}`).join("\n")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [linkLabel, ...rest] = line.split("|");
                return { label: linkLabel.trim(), href: rest.join("|").trim() };
              })
              .filter((link) => link.label !== "" || link.href !== ""),
          )
        }
      />
    </Field>
  );
}

export function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field label={label}>
      <select
        id={id}
        className="form-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--cerulean)]"
      />
      {label}
    </label>
  );
}

export function EntryList<T extends object>({
  entries,
  fields,
  onChange,
  createEntry,
  itemTitle,
  addLabel,
  emptyText,
}: {
  entries: T[];
  fields: FieldDef[];
  onChange: (entries: T[]) => void;
  createEntry: () => T;
  itemTitle: (entry: T) => string;
  addLabel: string;
  emptyText: string;
}) {
  function update(index: number, key: string, value: unknown) {
    const next = entries.map((entry, entryIndex) =>
      entryIndex === index ? ({ ...entry, [key]: value } as T) : entry,
    );
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {entries.length === 0 ? (
        <p className="form-status">{emptyText}</p>
      ) : (
        entries.map((entry, index) => {
          const record = entry as Record<string, unknown>;
          return (
            <details key={index} className="card overflow-hidden px-4 py-3 md:px-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm font-semibold">
                <span className="min-w-0 truncate">
                  {itemTitle(entry) || `Untitled entry ${index + 1}`}
                </span>
                <span className="text-xs font-medium text-[var(--muted)]">Edit</span>
              </summary>

              <div className="mt-4 grid gap-4 border-t border-[var(--line)] pt-4 sm:grid-cols-2">
                {fields.map((field) => {
                  const value = record[field.key];
                  const className = field.full || fullWidthKinds.includes(field.kind) ? "sm:col-span-2" : "";
                  switch (field.kind) {
                    case "text":
                      return (
                        <TextInput
                          key={field.key}
                          label={field.label}
                          optional={field.optional}
                          placeholder={field.placeholder}
                          value={asString(value)}
                          onChange={(next) => update(index, field.key, next)}
                          className={className}
                        />
                      );
                    case "select":
                      return (
                        <SelectInput
                          key={field.key}
                          label={field.label}
                          options={field.options ?? []}
                          value={asString(value)}
                          onChange={(next) => update(index, field.key, next)}
                        />
                      );
                    case "checkbox":
                      return (
                        <CheckboxInput
                          key={field.key}
                          label={field.label}
                          checked={value === true}
                          onChange={(next) => update(index, field.key, next)}
                        />
                      );
                    case "area":
                      return (
                        <TextArea
                          key={field.key}
                          label={field.label}
                          optional={field.optional}
                          value={asString(value)}
                          onChange={(next) => update(index, field.key, next)}
                        />
                      );
                    case "lines":
                      return (
                        <LinesInput
                          key={field.key}
                          label={field.label}
                          optional={field.optional}
                          value={asLines(value)}
                          onChange={(next) => update(index, field.key, next)}
                        />
                      );
                    case "links":
                      return (
                        <LinksInput
                          key={field.key}
                          label={field.label}
                          optional={field.optional}
                          value={asLinks(value)}
                          onChange={(next) => update(index, field.key, next)}
                        />
                      );
                  }
                })}
              </div>

              <div className="mt-4 flex justify-end border-t border-[var(--line)] pt-3">
                <button
                  type="button"
                  onClick={() => onChange(entries.filter((_, entryIndex) => entryIndex !== index))}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#b23c33] transition-colors hover:bg-[rgba(240,113,103,0.12)] dark:text-[#ff9a92]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Remove entry
                </button>
              </div>
            </details>
          );
        })
      )}

      <div>
        <button
          type="button"
          onClick={() => onChange([...entries, createEntry()])}
          className="btn btn-outline min-h-0 px-4 py-2 text-xs"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
