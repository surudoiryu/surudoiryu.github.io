import { Box, Button, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useEffect, useState } from "react";
import logo from "../logo.svg";

export type AgeState = "unknown" | "age_verified" | "age_denied";
const KEY = "weedinfo_age_state";
const VERIFIED_MS = 180 * 24 * 60 * 60 * 1000;
const DENIED_MS = 24 * 60 * 60 * 1000;

export function readAgeState(): AgeState {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!stored?.state || !stored?.at) return "unknown";
    const ttl = stored.state === "age_verified" ? VERIFIED_MS : DENIED_MS;
    return Date.now() - stored.at <= ttl ? stored.state : "unknown";
  } catch { return "unknown"; }
}

export function writeAgeState(state: AgeState) {
  localStorage.setItem(KEY, JSON.stringify({ state, at: Date.now() }));
  window.dispatchEvent(new CustomEvent("weedinfo-age-change", { detail: state }));
}

export default function AgeGate({ state, onChange }: { state: AgeState; onChange: (state: AgeState) => void }) {
  const [showReset, setShowReset] = useState(false);
  useEffect(() => {
    const blocked = state !== "age_verified";
    document.body.style.overflow = blocked ? "hidden" : "";
    const content = document.getElementById("weedinfo-app-content");
    if (blocked) content?.setAttribute("inert", ""); else content?.removeAttribute("inert");
    return () => { document.body.style.overflow = ""; };
  }, [state]);
  if (state === "age_verified") return null;
  const choose = (next: AgeState) => { writeAgeState(next); onChange(next); };
  return <Dialog
    open
    disableEscapeKeyDown
    fullWidth
    maxWidth="xs"
    aria-labelledby="age-title"
    slotProps={{ backdrop: { sx: { bgcolor: "rgba(9,18,11,.58)", backdropFilter: "blur(5px)" } } }}
    PaperProps={{ sx: { width: "calc(100% - 32px)", maxWidth: 480, m: 2, borderRadius: 4, overflow: "hidden", textAlign: "center", boxShadow: "0 28px 80px rgba(0,0,0,.32)" } }}
  >
    <DialogContent sx={{ px: { xs: 3, sm: 6 }, pt: { xs: 4, sm: 5 }, pb: 2 }}>
      <Box component="img" src={logo} alt="WeedInfo" width={132} height={72} sx={{ display: "block", width: 132, height: 72, objectFit: "contain", mx: "auto", mb: 1.5 }} />
      <Box aria-hidden="true" sx={{ width: 42, height: 42, mx: "auto", mb: 1.5, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#e8f4ea", color: "#237a3b" }}>
        <LockOutlinedIcon fontSize="small" />
      </Box>
      <Typography id="age-title" component="h1" variant="h5" fontWeight={800}>Welkom bij WeedInfo</Typography>
      {state === "age_denied" ? <>
        <Typography mt={2} color="text.secondary" lineHeight={1.6}>WeedInfo is alleen toegankelijk voor personen van 18 jaar en ouder.</Typography>
        {showReset ? <Button sx={{ mt: 2 }} onClick={() => choose("unknown")}>Leeftijdskeuze opnieuw maken</Button> : <Button color="inherit" sx={{ mt: 2 }} onClick={() => setShowReset(true)}>Verkeerd gekozen?</Button>}
      </> : <Typography mt={2} color="text.secondary" lineHeight={1.6}>Informatie over cannabis is bedoeld voor volwassenen.<br />Ben je 18 jaar of ouder?</Typography>}
    </DialogContent>
    {state === "unknown" && <DialogActions sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1, px: { xs: 3, sm: 6 }, pt: 1.5, pb: { xs: 4, sm: 5 }, "& > :not(style) ~ :not(style)": { ml: 0 } }}>
      <Button fullWidth variant="contained" color="success" size="large" onClick={() => choose("age_verified")} sx={{ minHeight: 48, borderRadius: 2, fontWeight: 800, textTransform: "none" }}>Ja, ik ben 18 jaar of ouder</Button>
      <Button fullWidth color="inherit" size="large" onClick={() => choose("age_denied")} sx={{ minHeight: 44, borderRadius: 2, textTransform: "none" }}>Nee, ik ben jonger dan 18</Button>
    </DialogActions>}
  </Dialog>;
}
