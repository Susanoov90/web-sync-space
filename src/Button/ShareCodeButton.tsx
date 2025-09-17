// src/components/ShareCodeButton.tsx
import React from "react";
import { Button, Tooltip, Snackbar } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type Props = {
  sessionCode: string;
  label?: string;
};

export default function ShareCodeButton({
  sessionCode,
  label = "Partager le code",
}: Props) {
  const [tipOpen, setTipOpen] = React.useState(false);
  const [snackOpen, setSnackOpen] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setTipOpen(true);
      setSnackOpen(true);
      setTimeout(() => setTipOpen(false), 1100);
    } catch (e) {
      console.error(e);
      setSnackOpen(true);
    }
  };

  return (
    <>
      <Tooltip title={tipOpen ? "Code copié !" : ""} open={tipOpen}>
        <Button
          onClick={copy}
          startIcon={<ContentCopyIcon sx={{ fontSize: 18 }} />}
          // look: bleu nuit sobre sur fond noir
          sx={{
            textTransform: "none",
            borderRadius: 1.25,            // ~10px si base 8
            height: 28,                    // proche Start/Stop
            px: 1.75,                      // padding horizontal compact
            minWidth: 0,
            fontSize: "0.85rem",
            lineHeight: 1,
            bgcolor: "#0b3a6a",            // bleu nuit
            color: "#fff",
            boxShadow: "none",
            "&:hover": { bgcolor: "#0a3159", boxShadow: "none" },
            "&:active": { bgcolor: "#082845" },
            border: "1px solid rgba(255,255,255,0.08)", // subtil comme les autres
          }}
        >
          {label}
        </Button>
      </Tooltip>

      <Snackbar
        open={snackOpen}
        autoHideDuration={1600}
        onClose={() => setSnackOpen(false)}
        message="Code de session copié"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
}
