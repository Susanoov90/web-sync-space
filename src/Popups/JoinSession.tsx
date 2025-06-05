import { useState } from 'react';
import TextField from '@mui/material/TextField';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';

function JoinSession() {
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      const sessionRef = ref(db, `sessions/${code}`);
      const snapshot = await get(sessionRef);

      if (!snapshot.exists()) {
        setError("Cette session n'existe pas.");
        return;
      }

      const data = snapshot.val();
      if (data.sharedURL && data.sharedURL !== '') {
        // 1) On ouvre un nouvel onglet
        chrome.tabs.create({ url: data.sharedURL }, (tab) => {
          if (!tab.id) {
            setError("Impossible d’ouvrir l’onglet client.");
            return;
          }

          // 2) Injecter dans l’onglet client le rôle et l’ID
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: (sessionId: string) => {
                sessionStorage.setItem("websync-role", "client");
                sessionStorage.setItem("websync-session", sessionId);
              },
              args: [code],
            },
            () => {
              console.log("✅ Rôle + sessionId injectés dans l’onglet client :", code);

              // 3) Envoyer le message pour injecter client-content.js
              chrome.runtime.sendMessage(
                { type: "inject-client" },
                (res) => {
                  console.log("✅ client-content.js injecté :", res);
                }
              );
            }
          );
        });
      } else {
        setError("Aucune URL partagée pour cette session.");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue.");
    }
  };

  return (
    <>
      <p>Enter the join code of the session</p>
      <TextField
        hiddenLabel
        id="textfieldCustom"
        variant="filled"
        size="small"
        onChange={(e) => setCode(e.target.value)}
        slotProps={{
          input: {
            style: {
              color: 'white',
              backgroundColor: '#333',
            },
          },
        }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <button onClick={handleSubmit}>SUBMIT</button>
      </div>
    </>
  );
}

export default JoinSession;
