// src/TabLogic/SelectTab.tsx

import { useEffect, useState } from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { type SelectChangeEvent } from "@mui/material/Select";

export interface Tab {
  id: number;
  title: string;
  url: string;
}

type SelectTabProps = {
  onSelectTab: (tab: Tab) => void;
};

export default function SelectTab({ onSelectTab }: SelectTabProps) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<number | "">("");

  useEffect(() => {
    // Appel chrome.tabs.query pour récupérer les onglets de la fenêtre courante
    if (!chrome?.tabs) {
      console.warn("chrome.tabs non disponible. Testez dans l’extension Chrome.");
      return;
    }

    chrome.tabs.query({ currentWindow: true }, (queriedTabs) => {
      // On map chaque onglet vers notre interface `Tab`
      const t: Tab[] = queriedTabs.map((t) => ({
        id: t.id!,
        title: t.title || t.url || "Onglet sans titre",
        url: t.url || "",
      }));
      setTabs(t);
    });
  }, []);

  const handleChange = (e: SelectChangeEvent<string>) => {
    const id = Number(e.target.value);
    setSelectedTabId(id);

    // Trouver l’onglet correspondant dans la liste
    const found = tabs.find((t) => t.id === id);
    if (found) {
      onSelectTab(found);
    }
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="select-tab-label">Select Tab to Share</InputLabel>
      <Select
        labelId="select-tab-label"
        id="select-tab"
        value={selectedTabId === "" ? "" : selectedTabId.toString()}
        label="Select Tab to Share"
        onChange={handleChange}
        style={{ color: "#fff" }}
      >
        {tabs.map((tab) => (
          <MenuItem key={tab.id} value={tab.id.toString()}>
            {tab.title.length > 50
              ? tab.title.slice(0, 50) + "…"
              : tab.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
