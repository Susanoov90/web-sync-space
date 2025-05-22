import { useState } from 'react';
import TextField from '@mui/material/TextField';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import SubmitButton from '../Button/SubmitButton';

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

      if (data.sharedURL) {
        sessionStorage.setItem("websync-role", "client");
        window.open(data.sharedURL, '_blank');
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
        <SubmitButton content="SUBMIT" joinCode={code} onClick={handleSubmit} />
      </div>
    </>
  );
}

export default JoinSession;
