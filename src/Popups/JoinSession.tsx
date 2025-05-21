//import { Button } from '@mui/material';
import TextField from '@mui/material/TextField';
//import WelcomeButton from '../Button/WelcomeButton';
import SubmitButton from '../Button/SubmitButton';
import { useState } from 'react';

function JoinSession() {
    const [code, setCode] = useState<string>("");

    return (
        <>
            <p>Enter the join code of the session</p>

            <TextField
                hiddenLabel
                id="textfieldCustom"
                variant="filled"
                size="small"
                onChange={(e) => {console.log("code : ",e.target.value); setCode(e.target.value)}}
                slotProps={{
                    input: {
                        style: {
                            color: 'white',
                            backgroundColor: '#333', // optionnel
                        },
                    },
                }}
            />

            <div>
                <SubmitButton content='SUBMIT' joinCode={code}/>
            </div>
        </>
    )
}

export default JoinSession