import { SavedDocument, DocumentCategory } from "../types";

const STORAGE_KEY = "TERGOV_AI_DB_V1";
const QUOTA_WARN_BYTES = 4 * 1024 * 1024; // 4 MB

function loadDb(): SavedDocument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data == null) return [];
    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedDocument =>
        item != null &&
        typeof item === "object" &&
        typeof (item as SavedDocument).id === "string" &&
        typeof (item as SavedDocument).title === "string" &&
        typeof (item as SavedDocument).category === "string" &&
        typeof (item as SavedDocument).createdAt === "string" &&
        Array.isArray((item as SavedDocument).tags)
    );
  } catch {
    console.warn("TERGOV_AI_DB: corrupt or invalid data, resetting.");
    return [];
  }
}

function saveDb(data: SavedDocument[]): void {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > QUOTA_WARN_BYTES) {
      console.warn("TERGOV_AI_DB: storage size is large; consider archiving old documents.");
    }
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    const msg = "Xotira to'ldi yoki saqlash imkonsiz. Eski hujjatlarni o'chiring yoki brauzer xotirasini tozalang.";
    console.error("Storage error", e);
    throw new Error(msg);
  }
}

function generateId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const storageService = {
  saveDocument(doc: Omit<SavedDocument, "id" | "createdAt">): SavedDocument {
    const normalized: Omit<SavedDocument, "id" | "createdAt"> = {
      ...doc,
      title: (doc.title ?? "").trim() || "Nomsiz",
      category: doc.category,
      tags: Array.isArray(doc.tags) ? doc.tags : [],
    };
    const db = loadDb();
    const newDoc: SavedDocument = {
      ...normalized,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    db.unshift(newDoc);
    saveDb(db);
    return newDoc;
  },

  getDocuments(): SavedDocument[] {
    return loadDb();
  },

  deleteDocument(id: string): void {
    const db = loadDb().filter((d) => d.id !== id);
    saveDb(db);
  },

  getDocumentsByCategory(category: DocumentCategory): SavedDocument[] {
    return loadDb().filter((d) => d.category === category);
  },

  getDocumentById(id: string): SavedDocument | null {
    return loadDb().find((d) => d.id === id) ?? null;
  },
};
