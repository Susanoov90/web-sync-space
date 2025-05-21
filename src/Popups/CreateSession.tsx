import { useEffect, useState } from "react";
import "./CreateSession.css";
import { Button } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';

import { db } from "../firebase";
import { ref, set } from "firebase/database";

function CreateSession() {
  const [loader, setLoader] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const createSession = async () => {
      try {
        // 🔑 Génère un ID de session aléatoire simple (à améliorer)
        const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
        await set(ref(db, `sessions/${newSessionId}`), {
          createdAt: new Date().toISOString(),
          status: "active"
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
  }, []);

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
            <code>https://websyncspace.app/join/{sessionId}</code>
            <Tooltip title="Click to copy">
              <button
                className="contentSuccessCreateSession--copyAndPasteZone__buttonCopy"
                onClick={() => navigator.clipboard.writeText(`https://websyncspace.app/join/${sessionId}`)}
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

export default CreateSession;
