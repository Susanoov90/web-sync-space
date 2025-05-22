import { useEffect, useState } from "react";
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import FormHelperText from '@mui/material/FormHelperText';

interface Tab {
    id: number;
    url?: string;
    title?: string;
}

interface SelectTabProps {
    onSelectTab: (tab: Tab) => void;
}

function SelectTab({ onSelectTab }: SelectTabProps) {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [selectedTabId, setSelectedTabId] = useState("");

    // Récupérer tous les onglets de la fenêtre courante
    useEffect(() => {
        console.log("chrome.tabs.query dispo ?", chrome.tabs?.query);

        if (chrome.tabs?.query) {
            chrome.tabs.query({ currentWindow: true }, (result) => {
                setTabs(result as Tab[]);
            });
        } else {
            console.warn("chrome.tabs n’est pas dispo dans ce contexte");
        }
    }, []);

    const handleChange = (event: SelectChangeEvent) => {
        setSelectedTabId(event.target.value);
        const tab = tabs.find((t) => t.id?.toString() === event.target.value);
        if (tab) onSelectTab(tab);
    };

    return (
        <FormControl sx={{ color: "white", marginBottom: 2 }} fullWidth>
            <InputLabel id="select-tab-label" sx={{ color: "white" }}>Select Tab to Share</InputLabel>
            <Select
                labelId="select-tab-label"
                id="select-tab"
                value={selectedTabId}
                label="Select Tab to Share"
                onChange={handleChange}
                sx={{ color: "white", fontSize: "12px" }}
                MenuProps={{
                    PaperProps: {
                        sx: {
                            fontSize: "12px", // ⬅️ taille des éléments dans le menu déroulant
                        }
                    }
                }}
            >
                {tabs.map((tab) => (
                    <MenuItem key={tab.id} value={tab.id?.toString()}>
                        {tab.title} — {tab.url}
                    </MenuItem>
                ))}
            </Select>
            <FormHelperText sx={{ color: "white" }}>Choose the tab you want to sync</FormHelperText>
        </FormControl>
    );
}

export default SelectTab;
