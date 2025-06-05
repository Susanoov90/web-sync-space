import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./SessionCreated.css";
import { Button } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';

import { db } from "../firebase";
import { ref, set } from "firebase/database";
import type { Tab } from "../types/Tab";

type LocationState = {
  selectedTab: Tab;
  newSessionId: string;
};

function SessionCreated() {
  const location = useLocation();
  const { selectedTab, newSessionId } = location.state as LocationState;

  const [loader, setLoader] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const createSessionInFirebase = async () => {
      try {
        // newSessionId a déjà été généré dans BridgeToCreateSession
        // et injecté dans la page hôte, ici on l’enregistre dans Firebase
        await set(ref(db, `sessions/${newSessionId}`), {
          createdAt: new Date().toISOString(),
          status: "active",
          sharedURL: selectedTab.url,
        });
        setLoader(false);
      } catch (err) {
        console.error("Erreur lors de la création de la session :", err);
        setError(true);
        setLoader(false);
      }
    };
    createSessionInFirebase();
  }, [newSessionId, selectedTab.url]);

  return (
    <>
      {loader ? (
        <p>Création de la session en cours ...</p>
      ) : error ? (
        <p>Une erreur est survenue</p>
      ) : (
        <div className="contentSuccessCreateSession">
          <p>Votre session est active sous le lien :</p>
          <div className="contentSuccessCreateSession--copyAndPasteZone">
            <code>{newSessionId}</code>
            <Tooltip title="Click to copy">
              <button
                className="contentSuccessCreateSession--copyAndPasteZone__buttonCopy"
                onClick={() => navigator.clipboard.writeText(`${newSessionId}`)}
              >
                <ContentCopyIcon />
              </button>
            </Tooltip>
          </div>
          <p>Give it to everyone you want to share with !</p>
          <Button variant="contained" color="error">
            CLOSE SESSION
          </Button>
        </div>
      )}
    </>
  );
}

export default SessionCreated;
