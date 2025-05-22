import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./SessionCreated.css";
import { Button } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';

import { db } from "../firebase";
import { ref, set } from "firebase/database";
import type { Tab } from "../types/Tab";

function SessionCreated() {
  const location = useLocation();
  const selectedTab: Tab | null = location.state?.selectedTab || null;

  const [loader, setLoader] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const createSession = async () => {
      if (!selectedTab?.url) {
        setError(true);
        setLoader(false);
        return;
      }

      try {
        const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();

        await set(ref(db, `sessions/${newSessionId}`), {
          createdAt: new Date().toISOString(),
          status: "active",
          sharedURL: selectedTab.url
        });

        setSessionId(newSessionId);
        setLoader(false);
      } catch (err) {
        console.error("Erreur lors de la création de la session :", err);
        setError(true);
        setLoader(false);
      }
    };

    createSession();
  }, [selectedTab]);

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
            <code>{sessionId}</code>
            <Tooltip title="Click to copy">
              <button
                className="contentSuccessCreateSession--copyAndPasteZone__buttonCopy"
                onClick={() => navigator.clipboard.writeText(`${sessionId}`)}
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
