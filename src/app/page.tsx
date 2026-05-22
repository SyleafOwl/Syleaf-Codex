"use client";

import type { DragEvent, ReactNode } from "react";
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

type SortKey = "title" | "chapter" | "character" | "species" | "note";

type ColumnLabels = Record<SortKey, string>;

type SortConfig = {
  key: SortKey;
  direction: "asc" | "desc";
};

type ColumnDropPreview = {
  key: SortKey;
  position: "before" | "after";
} | null;

type CellSelection = {
  anchorRow: number;
  anchorColumn: SortKey;
  focusRow: number;
  focusColumn: SortKey;
} | null;

type SelectionStart = {
  rowIndex: number;
  columnKey: SortKey;
  x: number;
  y: number;
} | null;

const storageKey = "syleaf-codex-chapters-v1";
const storageKeyColumns = "syleaf-codex-columns-v1";
const storageKeyCover = "syleaf-codex-cover-v1";
const storageKeyCoverAdjustments = "syleaf-codex-cover-adjustments-v1";

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

const defaultColumnLabels: ColumnLabels = {
  title: "Title",
  chapter: "Chapter",
  character: "Characters",
  species: "Species",
  note: "Note",
};

const defaultColumnOrder: SortKey[] = ["title", "chapter", "character", "species", "note"];

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

function compareValues(left: ChapterRecord, right: ChapterRecord, key: SortKey) {
  if (key === "chapter") {
    return left.chapter - right.chapter;
  }

  return String(left[key] ?? "").localeCompare(String(right[key] ?? ""), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

export default function Home() {
  const [records, setRecords] = useState<ChapterRecord[]>(seedRecords);
  const [selectedId, setSelectedId] = useState(seedRecords[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [columnLabels, setColumnLabels] = useState<ColumnLabels>(defaultColumnLabels);
  const [columnOrder, setColumnOrder] = useState<SortKey[]>(defaultColumnOrder);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "chapter", direction: "asc" });
  const [coverImage, setCoverImage] = useState<string>("");
  const [activeColumnMenu, setActiveColumnMenu] = useState<SortKey | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<SortKey | null>(null);
  const [columnDropPreview, setColumnDropPreview] = useState<ColumnDropPreview>(null);
  const [cellSelection, setCellSelection] = useState<CellSelection>(null);
  const [selectionStart, setSelectionStart] = useState<SelectionStart>(null);
  const [isSelectingCells, setIsSelectingCells] = useState(false);
  const [coverAdjustments, setCoverAdjustments] = useState({ y: 50 });
  const [isCoverPanelOpen, setIsCoverPanelOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const savedColumns = window.localStorage.getItem(storageKeyColumns);
    const savedColumnOrder = window.localStorage.getItem("syleaf-codex-column-order-v1");
    const savedCover = window.localStorage.getItem(storageKeyCover);
    const savedCoverAdjustments = window.localStorage.getItem(storageKeyCoverAdjustments);

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

    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns) as Partial<ColumnLabels>;
        setColumnLabels((currentLabels) => ({ ...currentLabels, ...parsed }));
      } catch {
        window.localStorage.removeItem(storageKeyColumns);
      }
    }

    if (savedColumnOrder) {
      try {
        const parsed = JSON.parse(savedColumnOrder) as SortKey[];
        const validOrder = parsed.filter((key): key is SortKey => defaultColumnOrder.includes(key));

        if (validOrder.length === defaultColumnOrder.length) {
          setColumnOrder(validOrder);
        }
      } catch {
        window.localStorage.removeItem("syleaf-codex-column-order-v1");
      }
    }

    if (savedCover) {
      setCoverImage(savedCover);
    }

    if (savedCoverAdjustments) {
      try {
        const parsed = JSON.parse(savedCoverAdjustments) as Partial<typeof coverAdjustments>;
        setCoverAdjustments((currentAdjustments) => ({
          y: typeof parsed.y === "number" ? parsed.y : currentAdjustments.y,
        }));
      } catch {
        window.localStorage.removeItem(storageKeyCoverAdjustments);
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(records));
      window.localStorage.setItem(storageKeyColumns, JSON.stringify(columnLabels));
      window.localStorage.setItem("syleaf-codex-column-order-v1", JSON.stringify(columnOrder));
      window.localStorage.setItem(storageKeyCoverAdjustments, JSON.stringify(coverAdjustments));
      if (coverImage) {
        window.localStorage.setItem(storageKeyCover, coverImage);
      } else {
        window.localStorage.removeItem(storageKeyCover);
      }
    }
  }, [columnLabels, columnOrder, coverAdjustments, coverImage, isHydrated, records]);

  const visibleRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredRecords = records.filter((record) => {
      if (normalizedQuery.length === 0) return true;

      return [record.title, String(record.chapter), record.character, record.species, record.note]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return [...filteredRecords].sort((left, right) => {
      const comparison = compareValues(left, right, sortConfig.key);
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [query, records, sortConfig]);

  useEffect(() => {
    if (visibleRecords.length > 0 && !visibleRecords.some((record) => record.id === selectedId)) {
      setSelectedId(visibleRecords[0].id);
    }
  }, [selectedId, visibleRecords]);

  const selectedRecord =
    records.find((record) => record.id === selectedId) ?? visibleRecords[0] ?? records[0] ?? null;

  const selectedCellCount = useMemo(() => {
    if (!cellSelection) return 0;

    const anchorRow = Math.min(cellSelection.anchorRow, cellSelection.focusRow);
    const focusRow = Math.max(cellSelection.anchorRow, cellSelection.focusRow);
    const anchorColumnIndex = columnOrder.indexOf(cellSelection.anchorColumn);
    const focusColumnIndex = columnOrder.indexOf(cellSelection.focusColumn);

    if (anchorColumnIndex < 0 || focusColumnIndex < 0) return 0;

    const columnCount = Math.abs(focusColumnIndex - anchorColumnIndex) + 1;
    const rowCount = Math.abs(focusRow - anchorRow) + 1;
    return columnCount * rowCount;
  }, [cellSelection, columnOrder]);

  const isCellSelected = (rowIndex: number, columnKey: SortKey) => {
    if (!cellSelection) return false;

    const anchorRow = Math.min(cellSelection.anchorRow, cellSelection.focusRow);
    const focusRow = Math.max(cellSelection.anchorRow, cellSelection.focusRow);
    const columnIndex = columnOrder.indexOf(columnKey);
    const anchorColumnIndex = columnOrder.indexOf(cellSelection.anchorColumn);
    const focusColumnIndex = columnOrder.indexOf(cellSelection.focusColumn);

    if (columnIndex < 0 || anchorColumnIndex < 0 || focusColumnIndex < 0) return false;

    const leftColumn = Math.min(anchorColumnIndex, focusColumnIndex);
    const rightColumn = Math.max(anchorColumnIndex, focusColumnIndex);

    return rowIndex >= anchorRow && rowIndex <= focusRow && columnIndex >= leftColumn && columnIndex <= rightColumn;
  };

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

  const deleteRecord = () => {
    if (!selectedRecord) return;

    setRecords((currentRecords) => {
      const remaining = currentRecords.filter((record) => record.id !== selectedRecord.id);
      setSelectedId(remaining[0]?.id ?? "");
      return remaining.length > 0 ? remaining : [makeNewRecord()];
    });
  };

  const renameColumn = (key: SortKey) => {
    const nextLabel = window.prompt("Nuevo nombre para la columna", columnLabels[key]);

    if (!nextLabel) return;

    setColumnLabels((currentLabels) => ({
      ...currentLabels,
      [key]: nextLabel.trim() || currentLabels[key],
    }));
  };

  const moveColumn = (key: SortKey, targetIndex: number) => {
    setColumnOrder((currentOrder) => {
      const nextOrder = currentOrder.filter((item) => item !== key);
      const clampedIndex = Math.max(0, Math.min(targetIndex, nextOrder.length));
      nextOrder.splice(clampedIndex, 0, key);
      return nextOrder;
    });
  };

  const moveColumnNear = (key: SortKey, targetKey: SortKey, position: "before" | "after") => {
    setColumnOrder((currentOrder) => {
      const targetIndex = currentOrder.indexOf(targetKey);
      if (targetIndex < 0) return currentOrder;

      const nextOrder = currentOrder.filter((item) => item !== key);
      const insertionIndex = Math.max(
        0,
        Math.min(position === "before" ? targetIndex : targetIndex + 1, nextOrder.length),
      );

      nextOrder.splice(insertionIndex, 0, key);
      return nextOrder;
    });
  };

  const shiftColumn = (key: SortKey, delta: number) => {
    setColumnOrder((currentOrder) => {
      const currentIndex = currentOrder.indexOf(key);
      if (currentIndex < 0) return currentOrder;

      const nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= currentOrder.length) return currentOrder;

      const nextOrder = [...currentOrder];
      nextOrder.splice(currentIndex, 1);
      nextOrder.splice(nextIndex, 0, key);
      return nextOrder;
    });
  };

  const toggleSort = (key: SortKey) => {
    setSortConfig((currentSort) =>
      currentSort.key === key
        ? { key, direction: currentSort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "chapter" ? "asc" : "asc" },
    );
  };

  const handleCoverUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setCoverImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCoverAdjustmentChange = (value: number) => {
    setCoverAdjustments((currentAdjustments) => ({
      ...currentAdjustments,
      y: value,
    }));
  };

  const handleColumnDragStart = (event: DragEvent<HTMLDivElement>, key: SortKey) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    setDraggingColumn(key);
    setActiveColumnMenu(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, key: SortKey) => {
    event.preventDefault();

    if (!draggingColumn || draggingColumn === key) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientX < bounds.left + bounds.width / 2 ? "before" : "after";
    setColumnDropPreview({ key, position });
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, key: SortKey) => {
    event.preventDefault();

    const draggedKey = (event.dataTransfer.getData("text/plain") as SortKey) || draggingColumn;

    if (!draggedKey || draggedKey === key) {
      setDraggingColumn(null);
      setColumnDropPreview(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientX < bounds.left + bounds.width / 2 ? "before" : "after";
    moveColumnNear(draggedKey, key, position);
    setDraggingColumn(null);
    setColumnDropPreview(null);
  };

  const clearColumnDragState = () => {
    setDraggingColumn(null);
    setColumnDropPreview(null);
  };

  const startCellSelection = (rowIndex: number, columnKey: SortKey) => {
    setCellSelection({ anchorRow: rowIndex, anchorColumn: columnKey, focusRow: rowIndex, focusColumn: columnKey });
    setIsSelectingCells(true);
  };

  const updateCellSelection = (rowIndex: number, columnKey: SortKey) => {
    if (!isSelectingCells) return;

    setCellSelection((currentSelection) =>
      currentSelection
        ? { ...currentSelection, focusRow: rowIndex, focusColumn: columnKey }
        : { anchorRow: rowIndex, anchorColumn: columnKey, focusRow: rowIndex, focusColumn: columnKey },
    );
  };

  const clearCellSelection = () => {
    setCellSelection(null);
    setIsSelectingCells(false);
    setSelectionStart(null);
  };

  const clearSelectedCells = () => {
    if (!cellSelection) return;

    const anchorRow = Math.min(cellSelection.anchorRow, cellSelection.focusRow);
    const focusRow = Math.max(cellSelection.anchorRow, cellSelection.focusRow);
    const anchorColumnIndex = columnOrder.indexOf(cellSelection.anchorColumn);
    const focusColumnIndex = columnOrder.indexOf(cellSelection.focusColumn);

    if (anchorColumnIndex < 0 || focusColumnIndex < 0) return;

    const leftColumn = Math.min(anchorColumnIndex, focusColumnIndex);
    const rightColumn = Math.max(anchorColumnIndex, focusColumnIndex);
    const selectedColumns = columnOrder.slice(leftColumn, rightColumn + 1);
    const selectedRowIds = visibleRecords.slice(anchorRow, focusRow + 1).map((record) => record.id);

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (!selectedRowIds.includes(record.id)) return record;

        const updates: Partial<ChapterRecord> = {};

        for (const columnKey of selectedColumns) {
          if (columnKey === "chapter") {
            updates.chapter = 0;
          } else {
            updates[columnKey] = "";
          }
        }

        return { ...record, ...updates, updatedAt: new Date().toISOString().slice(0, 10) };
      }),
    );
  };

  const selectAllCells = () => {
    if (visibleRecords.length === 0 || columnOrder.length === 0) return;

    setCellSelection({
      anchorRow: 0,
      anchorColumn: columnOrder[0],
      focusRow: visibleRecords.length - 1,
      focusColumn: columnOrder[columnOrder.length - 1],
    });
  };

  useEffect(() => {
    if (!isSelectingCells) return;

    const stopSelection = () => setIsSelectingCells(false);

    window.addEventListener("pointerup", stopSelection);
    window.addEventListener("pointercancel", stopSelection);

    return () => {
      window.removeEventListener("pointerup", stopSelection);
      window.removeEventListener("pointercancel", stopSelection);
    };
  }, [isSelectingCells]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!selectionStart) return;

      const deltaX = Math.abs(event.clientX - selectionStart.x);
      const deltaY = Math.abs(event.clientY - selectionStart.y);
      const isThresholdPassed = deltaX > 4 || deltaY > 4;

      if (!isSelectingCells && isThresholdPassed) {
        setCellSelection({
          anchorRow: selectionStart.rowIndex,
          anchorColumn: selectionStart.columnKey,
          focusRow: selectionStart.rowIndex,
          focusColumn: selectionStart.columnKey,
        });
        setIsSelectingCells(true);
      }
    };

    const handlePointerUp = () => {
      setSelectionStart(null);
      setIsSelectingCells(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        if (visibleRecords.length === 0 || columnOrder.length === 0) return;

        event.preventDefault();
        setCellSelection({
          anchorRow: 0,
          anchorColumn: columnOrder[0],
          focusRow: visibleRecords.length - 1,
          focusColumn: columnOrder[columnOrder.length - 1],
        });
        return;
      }

      if (!cellSelection) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        clearSelectedCells();
      }

      if (event.key === "Escape") {
        clearCellSelection();
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cellSelection, clearCellSelection, clearSelectedCells, columnOrder, isSelectingCells, selectionStart, visibleRecords]);

  const renderTableCell = (key: SortKey, record: ChapterRecord, recordIndex: number, isSelectionMode: boolean) => {
    switch (key) {
      case "title":
        return (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-white/12 text-[9px] text-white/35" />
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
                readOnly={isSelectionMode}
                className={`w-full bg-transparent font-medium text-white outline-none ${isSelectionMode ? "cursor-cell" : ""}`}
              />
              <div className="text-[11px] text-white/35">Actualizado {formatDate(record.updatedAt)}</div>
            </div>
          </div>
        );
      case "chapter":
        return (
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
            readOnly={isSelectionMode}
            className={`w-full bg-transparent text-white outline-none ${isSelectionMode ? "cursor-cell" : ""}`}
          />
        );
      case "character":
        return (
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
            readOnly={isSelectionMode}
            className={`w-full bg-transparent text-white outline-none ${isSelectionMode ? "cursor-cell" : ""}`}
          />
        );
      case "species":
        return (
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
            readOnly={isSelectionMode}
            className={`w-full bg-transparent text-white outline-none ${isSelectionMode ? "cursor-cell" : ""}`}
          />
        );
      case "note":
        return (
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
            readOnly={isSelectionMode}
            className={`w-full bg-transparent text-white outline-none ${isSelectionMode ? "cursor-cell" : ""}`}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1c] text-[#e8e7e3]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[220px] shrink-0 border-r border-white/6 bg-[#1b1b19] px-3 py-3 lg:flex lg:flex-col">
          <div className="mb-3 px-2 text-sm font-medium text-white/90">Espacio de Syleaf</div>
          <div className="space-y-1 text-sm text-white/80">
            <div className="rounded-md bg-white/6 px-3 py-1.5">Fabulous Beasts | You Shou Yan</div>
            <div className="rounded-md px-3 py-1.5 text-white/55">Privado</div>
          </div>
          <div className="mt-5 px-2 text-xs uppercase tracking-[0.18em] text-white/40">Páginas</div>
          <button
            type="button"
            onClick={addRecord}
            className="mt-2 rounded-md px-3 py-1.5 text-left text-sm text-white/75 hover:bg-white/6"
          >
            + Agregar página nueva
          </button>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-white/6 bg-[#1b1b19] px-4 py-3 sm:px-6 lg:px-8">
            <div className="max-w-[1400px]">
              <div className="overflow-hidden rounded-[14px] border border-white/8 bg-[#242421]">
                <div className="relative">
                  {coverImage ? (
                    <div
                      className="h-56 w-full bg-cover sm:h-64"
                      style={{
                        backgroundImage: `url(${coverImage})`,
                        backgroundPosition: `50% ${coverAdjustments.y}%`,
                      }}
                    />
                  ) : (
                    <div className="flex h-56 w-full items-center justify-center bg-[linear-gradient(135deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))] text-sm text-white/35 sm:h-64">
                      Sube una imagen de portada
                    </div>
                  )}

                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-black/20 bg-black/55 px-2 py-1 text-[11px] text-white shadow-lg shadow-black/25 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setIsCoverPanelOpen((current) => !current)}
                      className="rounded-full px-2 py-1 text-white/85 hover:bg-white/10"
                    >
                      Reposicionar
                    </button>
                    <label className="cursor-pointer rounded-full px-2 py-1 text-white/85 hover:bg-white/10">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleCoverUpload(event.target.files?.[0] ?? null)}
                      />
                      Reemplazar
                    </label>
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="rounded-full px-2 py-1 text-white/85 hover:bg-white/10"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                {isCoverPanelOpen ? (
                  <div className="border-t border-white/6 bg-[#20201d] px-4 py-3 text-sm text-white/70">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-white/35">Reposicionar portada</div>
                    <div className="space-y-2">
                      <label className="block space-y-2">
                        <span className="text-xs text-white/45">Mover arriba / abajo</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={coverAdjustments.y}
                          onChange={(event) => handleCoverAdjustmentChange(Number(event.target.value))}
                          className="w-full"
                        />
                      </label>
                      <div className="flex items-center gap-2 text-xs text-white/45">
                        <button
                          type="button"
                          onClick={() => setCoverAdjustments({ y: 50 })}
                          className="rounded-md border border-white/8 px-3 py-1.5 text-white/70 hover:bg-white/5"
                        >
                          Centrar
                        </button>
                        <span>Solo mueve la imagen dentro del recorte, como en Notion.</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-b border-white/6 bg-[#1f1f1d] px-4 py-3 sm:px-6 lg:px-8">
            <div className="max-w-[1400px] space-y-3">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <span>Fabulous Beasts | You Shou Yan</span>
                <span>·</span>
                <span>Base de datos</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-[24px] font-semibold leading-none tracking-tight text-white sm:text-[26px]">Favoritos</h1>
                  <p className="mt-2 max-w-2xl text-[13px] leading-5 text-white/55">
                    Solo tabla por ahora. Haz clic en una fila para editarla a la derecha.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addRecord}
                    className="h-8 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
                  >
                    Nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex max-w-[1400px] flex-col gap-3 xl:flex-row">
              <section className="min-w-0 flex-1 rounded-[14px] border border-white/6 bg-[#1a1a18]">
                <div className="flex items-center gap-3 border-b border-white/6 px-4 py-2.5 text-sm text-white/70">
                  <button className="rounded-md bg-white/8 px-3 py-1 font-medium text-white">Tabla</button>
                  <span className="text-white/30">Vista</span>
                  {cellSelection ? <span className="text-xs text-white/40">{selectedCellCount} celdas seleccionadas</span> : null}
                  <div className="ml-auto flex items-center gap-3">
                    <label className="rounded-md border border-white/8 bg-[#22221f] px-3 py-1 text-white/55">
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar"
                        className="w-36 bg-transparent text-[13px] outline-none placeholder:text-white/30"
                      />
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
                    <thead className="bg-[#1a1a18] text-xs text-white/40">
                      <tr>
                        {columnOrder.map((key) => (
                          <TableHead key={key}>
                            <HeaderCell
                              label={columnLabels[key]}
                              sortKey={key}
                              sortConfig={sortConfig}
                              onSort={() => toggleSort(key)}
                              onRename={() => renameColumn(key)}
                              onOpenMenu={() => setActiveColumnMenu((current) => (current === key ? null : key))}
                              onCloseMenu={() => setActiveColumnMenu(null)}
                              activeColumnMenu={activeColumnMenu}
                              onMoveLeft={() => shiftColumn(key, -1)}
                              onMoveRight={() => shiftColumn(key, 1)}
                              onMoveToStart={() => moveColumn(key, 0)}
                              onMoveToEnd={() => moveColumn(key, columnOrder.length - 1)}
                              onMoveToPosition={(position) => moveColumn(key, position - 1)}
                              onDragStart={(event) => handleColumnDragStart(event, key)}
                              onDragOver={(event) => handleColumnDragOver(event, key)}
                              onDrop={(event) => handleColumnDrop(event, key)}
                              onDragEnd={clearColumnDragState}
                              isDragging={draggingColumn === key}
                              dropPreview={columnDropPreview?.key === key ? columnDropPreview.position : null}
                            />
                          </TableHead>
                        ))}
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
                            {columnOrder.map((key) => {
                              const cellSelected = isCellSelected(recordIndex, key);

                              return (
                                <td
                                  key={key}
                                  onPointerDown={(event) => {
                                    setSelectionStart({
                                      rowIndex: recordIndex,
                                      columnKey: key,
                                      x: event.clientX,
                                      y: event.clientY,
                                    });
                                  }}
                                  onPointerEnter={() => {
                                    if (isSelectingCells) {
                                      updateCellSelection(recordIndex, key);
                                    }
                                  }}
                                  className={`border-b border-white/6 px-4 py-3 align-top text-white/82 ${
                                    cellSelected ? "bg-blue-500/20 ring-1 ring-inset ring-blue-400/70" : ""
                                  }`}
                                >
                                  <div className={isSelectingCells ? "pointer-events-none" : ""}>
                                    {renderTableCell(key, record, recordIndex, isSelectingCells)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {visibleRecords.length === 0 ? (
                        <tr>
                          <td colSpan={columnOrder.length} className="px-4 py-12 text-center text-sm text-white/45">
                            Sin resultados.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-white/6 px-4 py-2.5 text-xs text-white/40">
                  Pega aquí una tabla copiada desde Notion o Excel con columnas separadas por tabulaciones para importar varias filas.
                </div>
              </section>

              <aside className="w-full shrink-0 rounded-[14px] border border-white/6 bg-[#1a1a18] p-4 xl:w-[320px]">
                {selectedRecord ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-white/35">Página</div>
                      <input
                        value={selectedRecord.title}
                        onChange={(event) => updateRecord(selectedRecord.id, { title: event.target.value })}
                        className="mt-2 w-full bg-transparent text-[22px] font-semibold tracking-tight text-white outline-none placeholder:text-white/25"
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
                        className="min-h-24 w-full rounded-md border border-white/8 bg-[#22221f] px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
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

function HeaderCell({
  label,
  sortKey,
  sortConfig,
  onSort,
  onRename,
  activeColumnMenu,
  onOpenMenu,
  onCloseMenu,
  onMoveLeft,
  onMoveRight,
  onMoveToStart,
  onMoveToEnd,
  onMoveToPosition,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  dropPreview,
}: {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  onSort: () => void;
  onRename: () => void;
  activeColumnMenu: SortKey | null;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onMoveToStart: () => void;
  onMoveToEnd: () => void;
  onMoveToPosition: (position: number) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  dropPreview: "before" | "after" | null;
}) {
  const isActive = sortConfig.key === sortKey;
  const sortIndicator = isActive ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative flex items-center gap-2 rounded-md px-1 py-0.5 ${isDragging ? "opacity-60" : ""}`}
    >
      {dropPreview === "before" ? <span className="absolute -left-2 top-0 h-full w-0.5 rounded bg-white/70" /> : null}
      {dropPreview === "after" ? <span className="absolute -right-2 top-0 h-full w-0.5 rounded bg-white/70" /> : null}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex cursor-grab items-center gap-1 text-left text-xs font-medium text-white/65 hover:text-white active:cursor-grabbing"
        title="Arrastra para mover la columna"
      >
        <span>{label}</span>
        <span className="text-[10px] text-white/28">⋮⋮</span>
      </button>
      <button
        type="button"
        onClick={onSort}
        className="rounded border border-white/8 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/40 hover:bg-white/5 hover:text-white/70"
        title={isActive ? `Orden actual ${sortIndicator}` : `Ordenar ${label}`}
      >
        {sortIndicator}
      </button>
      {activeColumnMenu === sortKey ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-52 rounded-xl border border-white/8 bg-[#232320] p-2 shadow-2xl shadow-black/40">
          <button
            type="button"
            onClick={() => {
              onRename();
              onCloseMenu();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-white/75 hover:bg-white/6"
          >
            Cambiar nombre
          </button>
          <button
            type="button"
            onClick={() => {
              onMoveLeft();
              onCloseMenu();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-white/75 hover:bg-white/6"
          >
            Mover a la izquierda
          </button>
          <button
            type="button"
            onClick={() => {
              onMoveRight();
              onCloseMenu();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-white/75 hover:bg-white/6"
          >
            Mover a la derecha
          </button>
          <button
            type="button"
            onClick={() => {
              onMoveToStart();
              onCloseMenu();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-white/75 hover:bg-white/6"
          >
            Mover al inicio
          </button>
          <button
            type="button"
            onClick={() => {
              onMoveToEnd();
              onCloseMenu();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-white/75 hover:bg-white/6"
          >
            Mover al final
          </button>
          <button
            type="button"
            onClick={() => {
              const nextPosition = window.prompt("Mover a posición (1 = primera columna)", "1");
              if (nextPosition) {
                const parsedPosition = Number(nextPosition);
                if (!Number.isNaN(parsedPosition) && parsedPosition >= 1) {
                  onMoveToPosition(parsedPosition);
                }
              }
              onCloseMenu();
            }}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-white/75 hover:bg-white/6"
          >
            Mover a posición...
          </button>
        </div>
      ) : null}
    </div>
  );
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
