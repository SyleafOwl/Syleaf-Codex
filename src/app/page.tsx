"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type ChapterRecord = {
  id: string;
  title: string;
  chapter: number;
  character: string;
  species: string;
  note: string;
  updatedAt: string;
};

const storageKey = "syleaf-codex-chapters-v1";

const speciesDirectory: Record<string, string> = {
  Sibuxiang: "Deer",
  Tuye: "Rabbit",
  Panhu: "Tiger",
  Maomaolei: "Cat",
  Lizhi: "Fox",
  Zhuangzhuang: "Boar",
};

const seedRecords: ChapterRecord[] = [
  { id: "cap-444", title: "Cap. 444", chapter: 444, character: "", species: "", note: "", updatedAt: "2026-05-21" },
  { id: "cap-460", title: "Cap. 460", chapter: 460, character: "", species: "", note: "", updatedAt: "2026-05-21" },
  { id: "cap-617", title: "Sibuxiang SPA", chapter: 617, character: "Sibuxiang", species: "Sibuxiang", note: "", updatedAt: "2026-05-21" },
  { id: "cap-661", title: "Confesión", chapter: 661, character: "Lizhi | Zhuangzhuang", species: "", note: "", updatedAt: "2026-05-21" },
  { id: "cap-707", title: "Ovidarse", chapter: 707, character: "Panhu | Maomaolei", species: "", note: "", updatedAt: "2026-05-21" },
];

function makeNewRecord(): ChapterRecord {
  return {
    id: crypto.randomUUID(),
    title: "Nuevo capitulo",
    chapter: 0,
    character: "",
    species: "",
    note: "",
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCharacterLabel(character: string, species: string) {
  const name = character.trim();
  const type = species.trim();

  if (!name) return "";
  if (!type) return name;

  return `${name} (${type})`;
}

function getKnownSpecies(character: string) {
  const firstName = character
    .split("|")
    .map((item) => item.trim())
    .find(Boolean);

  if (!firstName) return "";

  return speciesDirectory[firstName] ?? "";
}

export default function Home() {
  const [records, setRecords] = useState<ChapterRecord[]>(seedRecords);
  const [selectedId, setSelectedId] = useState(seedRecords[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChapterRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords(parsed);
          setSelectedId(parsed[0].id);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(records));
    }
  }, [isHydrated, records]);

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      if (normalizedQuery.length === 0) return true;

      return [record.title, String(record.chapter), record.character, record.species, record.note]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, records]);

  useEffect(() => {
    if (visibleRecords.length > 0 && !visibleRecords.some((record) => record.id === selectedId)) {
      setSelectedId(visibleRecords[0].id);
    }
  }, [selectedId, visibleRecords]);

  const selectedRecord =
    records.find((record) => record.id === selectedId) ?? visibleRecords[0] ?? records[0] ?? null;

  const updateRecord = (recordId: string, updates: Partial<ChapterRecord>) => {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === recordId
          ? { ...record, ...updates, updatedAt: new Date().toISOString().slice(0, 10) }
          : record,
      ),
    );
  };

  const updateRecordByIndex = (recordIndex: number, updates: Partial<ChapterRecord>) => {
    const record = visibleRecords[recordIndex];

    if (!record) return;

    updateRecord(record.id, updates);
  };

  const handlePasteGrid = (
    recordIndex: number,
    field: keyof Pick<ChapterRecord, "title" | "chapter" | "character" | "species" | "note">,
    pastedText: string,
  ) => {
    const rows = pastedText
      .replaceAll("\r", "")
      .split("\n")
      .map((row) => row.trimEnd())
      .filter((row) => row.length > 0)
      .map((row) => row.split("\t"));

    if (rows.length === 0) return;

    setRecords((currentRecords) => {
      const nextRecords = [...currentRecords];

      rows.forEach((rowValues, rowOffset) => {
        const targetVisibleRecord = visibleRecords[recordIndex + rowOffset];
        const targetIndex = targetVisibleRecord
          ? nextRecords.findIndex((record) => record.id === targetVisibleRecord.id)
          : -1;

        const currentRecord =
          targetIndex >= 0 ? nextRecords[targetIndex] : { ...makeNewRecord(), id: crypto.randomUUID() };

        const mappedRecord: ChapterRecord = {
          ...currentRecord,
          title: rowValues[0]?.trim() ?? currentRecord.title,
          chapter: Number(rowValues[1] ?? currentRecord.chapter) || 0,
          character: rowValues[2]?.trim() ?? currentRecord.character,
          species: rowValues[3]?.trim() ?? currentRecord.species,
          note: rowValues[4]?.trim() ?? currentRecord.note,
          updatedAt: new Date().toISOString().slice(0, 10),
        };

        if (targetIndex >= 0) {
          nextRecords[targetIndex] = mappedRecord;
        } else {
          nextRecords.push(mappedRecord);
        }
      });

      return nextRecords;
    });
  };

  const addRecord = () => {
    const nextRecord = makeNewRecord();
    setRecords((currentRecords) => [nextRecord, ...currentRecords]);
    setSelectedId(nextRecord.id);
    setQuery("");
  };

  const applyKnownSpeciesToAll = () => {
    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        const knownSpecies = getKnownSpecies(record.character);

        if (!knownSpecies || record.species.trim() === knownSpecies) {
          return record;
        }

        return {
          ...record,
          species: knownSpecies,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
      }),
    );
  };

  const deleteRecord = () => {
    if (!selectedRecord) return;

    setRecords((currentRecords) => {
      const remaining = currentRecords.filter((record) => record.id !== selectedRecord.id);
      setSelectedId(remaining[0]?.id ?? "");
      return remaining.length > 0 ? remaining : [makeNewRecord()];
    });
  };

  return (
    <div className="min-h-screen bg-[#1f1f1d] text-[#e8e7e3]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-white/6 bg-[#1b1b19] px-3 py-4 lg:flex lg:flex-col">
          <div className="mb-4 px-2 text-sm font-medium text-white/90">Espacio de Syleaf</div>
          <div className="space-y-1 text-sm text-white/80">
            <div className="rounded-md bg-white/6 px-3 py-2">Fabulous Beasts | You Shou Yan</div>
            <div className="rounded-md px-3 py-2 text-white/55">Privado</div>
          </div>
          <div className="mt-5 px-2 text-xs uppercase tracking-[0.18em] text-white/40">Páginas</div>
          <button
            type="button"
            onClick={addRecord}
            className="mt-2 rounded-md px-3 py-2 text-left text-sm text-white/75 hover:bg-white/6"
          >
            + Agregar página nueva
          </button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-white/6 bg-[#1f1f1d] px-4 py-3 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] space-y-3">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <span>Fabulous Beasts | You Shou Yan</span>
                <span>·</span>
                <span>Base de datos</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-[30px] font-semibold leading-none tracking-tight text-white">Favoritos</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                    Solo tabla por ahora. Haz clic en una fila para editarla a la derecha. Las especies conocidas se pueden completar gratis y de forma local.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applyKnownSpeciesToAll}
                    className="h-9 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Completar especies
                  </button>
                  <button
                    type="button"
                    onClick={addRecord}
                    className="h-9 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
                  >
                    Nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex max-w-[1400px] flex-col gap-4 xl:flex-row">
              <section className="min-w-0 flex-1 rounded-[14px] border border-white/6 bg-[#1a1a18]">
                <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3 text-sm text-white/70">
                  <button className="rounded-md bg-white/8 px-3 py-1.5 font-medium text-white">Tabla</button>
                  <span className="text-white/30">Vista</span>
                  <div className="ml-auto flex items-center gap-3">
                    <label className="rounded-md border border-white/8 bg-[#22221f] px-3 py-1.5 text-white/55">
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar"
                        className="w-40 bg-transparent outline-none placeholder:text-white/30"
                      />
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-[14px]">
                    <thead className="bg-[#1a1a18] text-xs text-white/40">
                      <tr>
                        <TableHead>Name</TableHead>
                        <TableHead>Chapter</TableHead>
                        <TableHead>Characters</TableHead>
                        <TableHead>Species</TableHead>
                        <TableHead>Note</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRecords.map((record) => {
                        const isSelected = selectedRecord?.id === record.id;
                        const recordIndex = visibleRecords.findIndex((item) => item.id === record.id);

                        return (
                          <tr
                            key={record.id}
                            onClick={() => setSelectedId(record.id)}
                            className={isSelected ? "bg-white/6" : "hover:bg-white/4"}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-white/12 text-[10px] text-white/35" />
                                <div className="min-w-0 flex-1">
                                  <input
                                    value={record.title}
                                    onChange={(event) => updateRecordByIndex(recordIndex, { title: event.target.value })}
                                    onPaste={(event) => {
                                      const pasted = event.clipboardData.getData("text");
                                      if (pasted.includes("\t") || pasted.includes("\n")) {
                                        event.preventDefault();
                                        handlePasteGrid(recordIndex, "title", pasted);
                                      }
                                    }}
                                    className="w-full bg-transparent font-medium text-white outline-none"
                                  />
                                  <div className="text-xs text-white/35">Actualizado {formatDate(record.updatedAt)}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <input
                                value={record.chapter || ""}
                                onChange={(event) =>
                                  updateRecordByIndex(recordIndex, {
                                    chapter: Number.isNaN(Number(event.target.value)) ? 0 : Number(event.target.value),
                                  })
                                }
                                onPaste={(event) => {
                                  const pasted = event.clipboardData.getData("text");
                                  if (pasted.includes("\t") || pasted.includes("\n")) {
                                    event.preventDefault();
                                    handlePasteGrid(recordIndex, "chapter", pasted);
                                  }
                                }}
                                className="w-full bg-transparent text-white outline-none"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                value={formatCharacterLabel(record.character, record.species) || record.character}
                                onChange={(event) => updateRecordByIndex(recordIndex, { character: event.target.value })}
                                onPaste={(event) => {
                                  const pasted = event.clipboardData.getData("text");
                                  if (pasted.includes("\t") || pasted.includes("\n")) {
                                    event.preventDefault();
                                    handlePasteGrid(recordIndex, "character", pasted);
                                  }
                                }}
                                className="w-full bg-transparent text-white outline-none"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                value={record.species}
                                onChange={(event) => updateRecordByIndex(recordIndex, { species: event.target.value })}
                                onPaste={(event) => {
                                  const pasted = event.clipboardData.getData("text");
                                  if (pasted.includes("\t") || pasted.includes("\n")) {
                                    event.preventDefault();
                                    handlePasteGrid(recordIndex, "species", pasted);
                                  }
                                }}
                                className="w-full bg-transparent text-white outline-none"
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                value={record.note}
                                onChange={(event) => updateRecordByIndex(recordIndex, { note: event.target.value })}
                                onPaste={(event) => {
                                  const pasted = event.clipboardData.getData("text");
                                  if (pasted.includes("\t") || pasted.includes("\n")) {
                                    event.preventDefault();
                                    handlePasteGrid(recordIndex, "note", pasted);
                                  }
                                }}
                                className="w-full bg-transparent text-white outline-none"
                              />
                            </TableCell>
                          </tr>
                        );
                      })}

                      {visibleRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-sm text-white/45">
                            Sin resultados.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-white/6 px-4 py-3 text-xs text-white/40">
                  Pega aquí una tabla copiada desde Notion o Excel con columnas separadas por tabulaciones para importar varias filas.
                </div>
              </section>

              <aside className="w-full shrink-0 rounded-[14px] border border-white/6 bg-[#1a1a18] p-4 xl:w-[360px]">
                {selectedRecord ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">Página</div>
                      <input
                        value={selectedRecord.title}
                        onChange={(event) => updateRecord(selectedRecord.id, { title: event.target.value })}
                        className="mt-2 w-full bg-transparent text-[28px] font-semibold tracking-tight text-white outline-none placeholder:text-white/25"
                      />
                    </div>

                    <Property
                      label="Chapter"
                      value={String(selectedRecord.chapter)}
                      onChange={(value) =>
                        updateRecord(selectedRecord.id, {
                          chapter: Number.isNaN(Number(value)) ? 0 : Number(value),
                        })
                      }
                    />
                    <Property
                      label="Characters"
                      value={selectedRecord.character}
                      onChange={(value) => updateRecord(selectedRecord.id, { character: value })}
                    />
                    <Property
                      label="Species"
                      value={selectedRecord.species}
                      onChange={(value) => updateRecord(selectedRecord.id, { species: value })}
                    />
                    <div className="rounded-md border border-white/8 bg-[#22221f] px-3 py-2 text-sm text-white/70">
                      Vista: {formatCharacterLabel(selectedRecord.character, selectedRecord.species) || "Sin personaje"}
                    </div>
                    <label className="block space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-white/35">Note</span>
                      <textarea
                        value={selectedRecord.note}
                        onChange={(event) => updateRecord(selectedRecord.id, { note: event.target.value })}
                        className="min-h-28 w-full rounded-md border border-white/8 bg-[#22221f] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                        placeholder="Escribe una nota..."
                      />
                    </label>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={deleteRecord}
                        className="rounded-md border border-white/8 px-3 py-2 text-sm text-white/70 hover:bg-white/5"
                      >
                        Eliminar
                      </button>
                      <div className="ml-auto text-xs text-white/35">{formatDate(selectedRecord.updatedAt)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/45">Selecciona una fila para editarla.</div>
                )}
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="border-b border-white/6 px-4 py-3 font-medium">{children}</th>;
}

function TableCell({ children }: { children: ReactNode }) {
  return <td className="border-b border-white/6 px-4 py-3 align-top text-white/82">{children}</td>;
}

function Property({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.18em] text-white/35">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-white/8 bg-[#22221f] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
      />
    </label>
  );
}
