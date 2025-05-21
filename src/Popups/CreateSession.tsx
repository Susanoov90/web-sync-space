import { useState } from "react";
import "./CreateSession.css"
import { Button } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Tooltip from '@mui/material/Tooltip';

function CreateSession() {
    // @ts-ignore
    const [loader, setLoader] = useState(false);

    // @ts-ignore
    const [stateLink, setStateLink] = useState(false);

    return(
        <>
            {loader ? ( <p>
                Création de la session en cours ...
            </p>) : stateLink ? (
                <div className="contentSuccessCreateSession">
                    <p>Votre session est actif sous le lien :</p>
                    <div className="contentSuccessCreateSession--copyAndPasteZone">
                        <code>https://websyncspace.app/join/ABC-123</code>
                        <Tooltip title="Click to copy">
                            <button className="contentSuccessCreateSession--copyAndPasteZone__buttonCopy">
                                <ContentCopyIcon/>
                            </button> 
                        </Tooltip>
                        
                    </div>
                    <p>Give it to everyone you want to share with !</p>
                    <Button variant="contained" color="error">
                        CLOSE SESSION
                    </Button>
                </div>
            ) : (<p>Une erreur est survenue</p>)}
        </>
    )
}

export default CreateSession