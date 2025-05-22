import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SelectTab from "../TabLogic/SelectTab";
import type { Tab } from "../types/Tab"; // ← Tu peux aussi déclarer l'interface localement
import { Button } from "@mui/material";

function BridgeToCreateSession() {
    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
    const navigate = useNavigate();

    const handleContinue = () => {
        if (selectedTab?.url) {
            sessionStorage.setItem("websync-role", "host");
            navigate("/created", { state: { selectedTab } });
        }
    };

    return (
        <>
            <p>Hold on... You're almost ready!</p>
            <SelectTab onSelectTab={(tab) => setSelectedTab(tab)} />
            <br />
            <Button disabled={!selectedTab} onClick={handleContinue} variant="contained">
                CREATE SESSION
            </Button>
        </>
    );
}

export default BridgeToCreateSession
