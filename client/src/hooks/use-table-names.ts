import { useState, useEffect } from "react";

export function useTableNames() {
  const [tableNames, setTableNames] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/tableNames", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data?.value) {
          try { setTableNames(JSON.parse(data.value)); } catch { setTableNames({}); }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const saveTableNames = async (names: Record<number, string>) => {
    setTableNames(names);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "tableNames", value: JSON.stringify(names) }),
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to save table names:", err);
    }
  };

  return { tableNames, saveTableNames, isLoading };
}
